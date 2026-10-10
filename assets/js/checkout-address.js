( function () {
	'use strict';

	// Dirección de entrega en el checkout/carrito de bloques. Corrige en el momento
	// lo que escribe el cliente o trae el autocompletado del navegador, para que no
	// se quede sin opciones de envío (la regla de fondo está en inc/checkout.php):
	//   - país siempre AR (el campo está oculto por CSS);
	//   - código postal con la letra de la provincia adelante ("1636" o "B1636FDA"
	//     → "B1636"; 1000 a 1499 es CABA, el resto GBA);
	//   - provincia según el código postal.
	// La letra no es estética: con país AR, el validador de WooCommerce en el
	// navegador solo acepta letra + 4 números y rechaza "1636" a secas. El servidor
	// la saca y guarda los 4 números, que es como están cargadas las zonas de envío.
	// Si el código postal es válido pero no hay reparto, avisa por qué.
	// Todo pasa por el data store de WooCommerce Blocks (wc/store/cart): los campos
	// son de React y pisar el value del input a mano no actualiza el pedido.

	if ( ! window.wp || ! wp.data || typeof wp.data.subscribe !== 'function' ) {
		return;
	}

	var STORE = 'wc/store/cart';
	var config = window.hfCheckoutAddress || {};
	var TYPES = [
		{ key: 'shippingAddress', action: 'setShippingAddress' },
		{ key: 'billingAddress', action: 'setBillingAddress' }
	];
	// Último código postal ya resuelto por dirección: la provincia se ajusta solo
	// cuando cambia el código postal, no cada vez que el cliente toca el desplegable.
	var lastPostcode = {};

	// Los 4 números del código postal, o '' si todavía no está completo ("B16").
	function postcodeDigits( value ) {
		var match = String( value || '' ).toUpperCase().match( /^\s*[A-Z]?\s?(\d{4})\s?[A-Z]{0,3}\s*$/ );
		return match ? match[ 1 ] : '';
	}

	function stateFor( digits ) {
		var n = parseInt( digits, 10 );
		return n >= 1000 && n <= 1499 ? 'C' : 'B';
	}

	var fixing = false;
	function fixAddresses( select ) {
		if ( fixing || typeof select.getCustomerData !== 'function' ) {
			return;
		}
		var customer = select.getCustomerData() || {};
		var dispatch = wp.data.dispatch( STORE );

		TYPES.forEach( function ( type ) {
			var address = customer[ type.key ];
			if ( ! address || typeof dispatch[ type.action ] !== 'function' ) {
				return;
			}
			var patch = {};
			if ( ! address.country ) {
				patch.country = 'AR';
			}
			var digits = postcodeDigits( address.postcode );
			if ( digits ) {
				// La letra del código postal argentino es el código de la provincia.
				if ( address.postcode !== stateFor( digits ) + digits ) {
					patch.postcode = stateFor( digits ) + digits;
				}
				if ( digits !== lastPostcode[ type.key ] ) {
					lastPostcode[ type.key ] = digits;
					if ( address.state !== stateFor( digits ) ) {
						patch.state = stateFor( digits );
					}
				}
			}
			if ( Object.keys( patch ).length ) {
				// El dispatch vuelve a disparar subscribe: el flag evita reentrar.
				fixing = true;
				try {
					dispatch[ type.action ]( patch );
				} finally {
					fixing = false;
				}
			}
		} );
	}

	function hasRates( cart ) {
		return ( cart.shippingRates || [] ).some( function ( pkg ) {
			return pkg.shipping_rates && pkg.shipping_rates.length;
		} );
	}

	function renderNoCoverage( select ) {
		var step = document.querySelector( '.wc-block-checkout__shipping-option' );
		if ( ! step ) {
			return;
		}
		var notice = step.querySelector( '.hf-no-coverage' );
		var cart = select.getCartData() || {};
		var postcode = postcodeDigits( ( cart.shippingAddress || {} ).postcode );
		var updating = typeof select.isCustomerDataUpdating === 'function' && select.isCustomerDataUpdating();
		var show = postcode && ! hasRates( cart ) && ! updating;

		if ( ! show ) {
			if ( notice ) {
				notice.remove();
			}
			return;
		}
		if ( notice && notice.getAttribute( 'data-postcode' ) === postcode ) {
			return;
		}
		if ( ! notice ) {
			notice = document.createElement( 'div' );
			notice.className = 'hf-no-coverage';
			notice.setAttribute( 'role', 'status' );
			step.appendChild( notice );
		}
		notice.setAttribute( 'data-postcode', postcode );
		notice.textContent = '';

		var title = document.createElement( 'strong' );
		title.textContent = 'Todavía no llegamos al código postal ' + postcode + '.';
		var text = document.createElement( 'span' );
		text.textContent = ' Entregamos en CABA, Zona Norte y Zona Oeste. Revisá que el código postal sean los 4 números de tu dirección de entrega';
		notice.appendChild( title );
		notice.appendChild( text );
		if ( config.whatsappUrl ) {
			var link = document.createElement( 'a' );
			link.href = config.whatsappUrl;
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			link.textContent = 'escribinos por WhatsApp';
			notice.appendChild( document.createTextNode( ' o ' ) );
			notice.appendChild( link );
		}
		notice.appendChild( document.createTextNode( '.' ) );
	}

	wp.data.subscribe( function () {
		var select = wp.data.select( STORE );
		// El store lo registra el bloque de WooCommerce; hasta que no resolvió el
		// carrito real devuelve uno vacío por defecto y no hay nada que corregir.
		if ( ! select || typeof select.getCartData !== 'function' ) {
			return;
		}
		if ( typeof select.hasFinishedResolution === 'function' && ! select.hasFinishedResolution( 'getCartData' ) ) {
			return;
		}
		fixAddresses( select );
		renderNoCoverage( select );
	} );
} )();
