<?php
/**
 * Checkout: datos de entrega a prueba de errores.
 *
 * Homefood solo entrega en CABA y GBA (Zona Norte / Oeste), así que el formulario
 * no necesita país ni las 24 provincias. Además, las zonas de envío de WooCommerce
 * se resuelven por código postal de 4 números: cualquier otro formato ("B1636FDA",
 * que es lo que suele guardar el autocompletado del navegador) dejaba al cliente sin
 * opciones de envío, y una provincia guardada con los códigos viejos ("CABA" / "BSAS",
 * de antes del go-live) hacía que la Store API rechazara toda la dirección.
 *
 * El autocompletado del navegador no se puede apagar de forma confiable (Chrome
 * ignora autocomplete="off" en direcciones), así que acá se corrige lo que trae:
 * país siempre AR, código postal a 4 números y provincia deducida del código postal.
 * La parte visual está en assets/js/checkout-address.js y en style.css.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function homefood_ar_states() {
	return [
		'C' => 'Ciudad Autónoma de Buenos Aires (CABA)',
		'B' => 'Provincia de Buenos Aires (GBA)',
	];
}

add_filter( 'woocommerce_states', function ( $states ) {
	$states['AR'] = homefood_ar_states();
	return $states;
} );

/**
 * "C1425DKF", "B1636" o "b 1636" → "1425" / "1636". Lo que no se parece a un código
 * postal argentino se devuelve como vino, para que falle la validación de abajo.
 */
function homefood_ar_postcode( $postcode ) {
	$postcode = strtoupper( trim( (string) $postcode ) );
	if ( preg_match( '/^[A-Z]?\s?(\d{4})\s?(?:[A-Z]{3})?$/', $postcode, $m ) ) {
		return $m[1];
	}
	return $postcode;
}

/**
 * Provincia según el código postal: 1000 a 1499 es CABA, el resto es provincia.
 * Sin código postal válido se conserva la provincia guardada, traduciendo los códigos
 * anteriores al go-live; cualquier otra (otra provincia del país) queda vacía.
 */
function homefood_ar_state( $state, $postcode ) {
	$postcode = homefood_ar_postcode( $postcode );
	if ( preg_match( '/^\d{4}$/', $postcode ) ) {
		return ( $postcode >= 1000 && $postcode <= 1499 ) ? 'C' : 'B';
	}

	$legacy = [
		'CABA' => 'C',
		'BSAS' => 'B',
	];
	$state  = strtoupper( trim( (string) $state ) );
	$state  = $legacy[ $state ] ?? $state;

	return isset( homefood_ar_states()[ $state ] ) ? $state : '';
}

// El país puede llegar vacío (sesión nueva sin ubicación por defecto): se trata como AR.
add_filter( 'woocommerce_format_postcode', function ( $postcode, $country ) {
	return in_array( $country, [ 'AR', '' ], true ) ? homefood_ar_postcode( $postcode ) : $postcode;
}, 10, 2 );

add_filter( 'woocommerce_validate_postcode', function ( $valid, $postcode, $country ) {
	if ( ! in_array( $country, [ 'AR', '' ], true ) ) {
		return $valid;
	}
	return (bool) preg_match( '/^\d{4}$/', homefood_ar_postcode( $postcode ) );
}, 10, 3 );

add_filter( 'woocommerce_customer_default_location_array', function ( $location ) {
	if ( empty( $location['country'] ) ) {
		$location['country'] = 'AR';
	}
	return $location;
} );

/**
 * Se corrige al leer los datos del cliente (no al guardarlos): así también quedan
 * bien las direcciones ya guardadas de clientes anteriores, sin tocar la base. De
 * estos getters salen la respuesta del carrito, el destino con el que se buscan las
 * zonas de envío y la dirección que se copia al pedido.
 */
foreach ( [ 'billing', 'shipping' ] as $homefood_address_type ) {
	add_filter( "woocommerce_customer_get_{$homefood_address_type}_country", function ( $country ) {
		return $country ? $country : 'AR';
	} );

	add_filter( "woocommerce_customer_get_{$homefood_address_type}_postcode", 'homefood_ar_postcode' );

	add_filter( "woocommerce_customer_get_{$homefood_address_type}_state", function ( $state, $customer ) use ( $homefood_address_type ) {
		return homefood_ar_state( $state, $customer->{"get_{$homefood_address_type}_postcode"}( 'edit' ) );
	}, 10, 2 );

	add_filter( "woocommerce_customer_get_{$homefood_address_type}", function ( $address ) {
		if ( ! is_array( $address ) ) {
			return $address;
		}
		if ( empty( $address['country'] ) ) {
			$address['country'] = 'AR';
		}
		$address['state']    = homefood_ar_state( $address['state'] ?? '', $address['postcode'] ?? '' );
		$address['postcode'] = homefood_ar_postcode( $address['postcode'] ?? '' );
		return $address;
	} );
}
unset( $homefood_address_type );

// El reparto necesita un teléfono de contacto: 1 de cada 10 pedidos llegaba sin él.
add_filter( 'pre_option_woocommerce_checkout_phone_field', function () {
	return 'required';
} );

add_filter( 'woocommerce_get_country_locale', function ( $locale ) {
	$locale['AR'] = array_replace_recursive( $locale['AR'] ?? [], [
		'address_1' => [
			'label'       => 'Calle y número',
			'placeholder' => 'Ej.: Av. Maipú 1234',
		],
		'address_2' => [
			'label'       => 'Piso, depto o lote',
			'placeholder' => 'Piso, depto o lote (opcional)',
		],
		'city'      => [ 'label' => 'Localidad o barrio' ],
		'state'     => [ 'label' => 'Provincia' ],
		'postcode'  => [ 'label' => 'Código postal (4 números)' ],
	] );
	return $locale;
} );

add_action( 'wp_enqueue_scripts', function () {
	if ( ! function_exists( 'is_checkout' ) || ! ( is_checkout() || is_cart() ) ) {
		return;
	}
	wp_enqueue_script(
		'homefood-checkout-address',
		get_template_directory_uri() . '/assets/js/checkout-address.js',
		[ 'wp-data' ],
		filemtime( get_template_directory() . '/assets/js/checkout-address.js' ),
		true
	);
	wp_add_inline_script(
		'homefood-checkout-address',
		'window.hfCheckoutAddress = ' . wp_json_encode( [
			// Mismo número que el botón flotante de WhatsApp (functions.php).
			'whatsappUrl' => 'https://wa.me/5491157521076',
		] ) . ';',
		'before'
	);
} );
