<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter( 'body_class', function ( $classes ) {
	if ( function_exists( 'is_product' ) && is_product() ) {
		$classes[] = 'hf-product-page-body';
	}
	if ( function_exists( 'is_cart' ) && is_cart() ) {
		$classes[] = 'hf-cart-page-body';
	}
	if ( function_exists( 'is_checkout' ) && is_checkout() ) {
		$classes[] = 'hf-checkout-page-body';
	}
	return $classes;
} );

add_action( 'after_setup_theme', function () {
	add_theme_support( 'woocommerce' );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'title-tag' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'editor-styles' );
} );

add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style(
		'homefood-fonts',
		'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Work+Sans:wght@400;500;600;700&display=swap',
		[],
		null
	);

	wp_enqueue_style(
		'homefood-style',
		get_template_directory_uri() . '/assets/css/style.css',
		[ 'homefood-fonts' ],
		filemtime( get_template_directory() . '/assets/css/style.css' )
	);

	// La ruta del logo debe resolverse por PHP (get_template_directory_uri) para ser
	// portable entre el staging (subcarpeta /homefood/) y producción (dominio raíz).
	// Los templates HTML de FSE no ejecutan PHP, así que se inyecta como custom property.
	$logo_url = esc_url( get_template_directory_uri() . '/assets/images/logo.png' );
	wp_add_inline_style( 'homefood-style', ":root{--hf-logo-url:url('{$logo_url}');}" );

	// Mismo criterio que el logo: las fotos del home se referencian por PHP para
	// ser portables entre el staging (subcarpeta /homefood/) y producción (raíz).
	$images_uri  = get_template_directory_uri() . '/assets/images/';
	$home_images = [
		'--hf-img-hero'             => 'hero-generico.webp',
		'--hf-img-hero-fitness'     => 'hero-fitness.webp',
		'--hf-img-hero-keto'        => 'hero-keto.webp',
		'--hf-img-hero-vegetariano' => 'hero-vegetariano.webp',
		'--hf-img-cat-clasicos'   => 'cat-clasicos.webp',
		'--hf-img-cat-combos'     => 'cat-combos.webp',
		'--hf-img-cat-fitness'    => 'cat-fitness.webp',
		'--hf-img-cat-keto'       => 'cat-keto.webp',
		'--hf-img-cat-ensaladas'  => 'cat-ensaladas.webp',
		'--hf-img-cat-emp-pizza'  => 'cat-emp-pizza.webp',
		'--hf-img-cat-vegetariano' => 'cat-vegetariano.webp',
		'--hf-img-bg-cta-whatsapp' => 'bg-cta-whatsapp.webp',
		'--hf-img-journey-elegi'    => 'journey-elegi.webp',
		'--hf-img-journey-completa' => 'journey-completa.webp',
		'--hf-img-journey-agenda'   => 'journey-agenda.webp',
		'--hf-img-journey-recibi'   => 'journey-recibi.webp',
		'--hf-img-journey-disfruta' => 'journey-disfruta.webp',
	];
	$home_images_css = ':root{';
	foreach ( $home_images as $var => $file ) {
		$home_images_css .= "{$var}:url('" . esc_url( $images_uri . $file ) . "');";
	}
	$home_images_css .= '}';
	wp_add_inline_style( 'homefood-style', $home_images_css );

	// Depende de wp-data: en carrito/checkout el widget lee el data store de
	// WooCommerce Blocks (wc/store/cart) como fuente de verdad. wp-data debe
	// existir antes de que corra nuestro script.
	wp_enqueue_script(
		'homefood-order-progress',
		get_template_directory_uri() . '/assets/js/order-progress.js',
		[ 'wp-data' ],
		filemtime( get_template_directory() . '/assets/js/order-progress.js' ),
		true
	);

	wp_localize_script( 'homefood-order-progress', 'homefoodOrderRules', [
		'minimumTotal' => 70000,
		'minimumUnits' => 7,
		'storeApiCartUrl' => esc_url_raw( home_url( '/wp-json/wc/store/v1/cart' ) ),
	] );

	wp_enqueue_script(
		'homefood-testimonial-carousel',
		get_template_directory_uri() . '/assets/js/testimonial-carousel.js',
		[],
		filemtime( get_template_directory() . '/assets/js/testimonial-carousel.js' ),
		true
	);

	wp_enqueue_script(
		'homefood-product-carousel',
		get_template_directory_uri() . '/assets/js/product-carousel.js',
		[],
		filemtime( get_template_directory() . '/assets/js/product-carousel.js' ),
		true
	);

	wp_enqueue_script(
		'homefood-mobile-menu',
		get_template_directory_uri() . '/assets/js/mobile-menu.js',
		[],
		filemtime( get_template_directory() . '/assets/js/mobile-menu.js' ),
		true
	);

	if ( function_exists( 'is_product' ) && is_product() ) {
		wp_enqueue_script(
			'homefood-product-sticky-cta',
			get_template_directory_uri() . '/assets/js/product-sticky-cta.js',
			[],
			filemtime( get_template_directory() . '/assets/js/product-sticky-cta.js' ),
			true
		);
	}

	if ( function_exists( 'is_shop' ) && ( is_shop() || is_product_category() ) ) {
		wp_enqueue_script(
			'homefood-category-pills',
			get_template_directory_uri() . '/assets/js/category-pills.js',
			[],
			filemtime( get_template_directory() . '/assets/js/category-pills.js' ),
			true
		);
	}

	// Rediseño de las cards de producto: agrega tagline por categoría y arma la
	// fila de 2 acciones (Añadir + Ver producto) sin romper el add-to-cart AJAX.
	wp_enqueue_script(
		'homefood-product-cards',
		get_template_directory_uri() . '/assets/js/product-cards.js',
		[],
		filemtime( get_template_directory() . '/assets/js/product-cards.js' ),
		true
	);

	// Stepper +/- nativo del tema para inputs de cantidad — reemplaza al plugin
	// "Quantity Plus Minus Button for WooCommerce" en ficha de producto, carrito
	// y grillas de listado.
	wp_enqueue_script(
		'homefood-quantity-stepper',
		get_template_directory_uri() . '/assets/js/quantity-stepper.js',
		[],
		filemtime( get_template_directory() . '/assets/js/quantity-stepper.js' ),
		true
	);

	// GSAP + ScrollTrigger auto-hospedados (sin CDN externo, mismo criterio que
	// el resto del tema) — solo en el home, que es la única plantilla con hero
	// slider, scroll-reveal y el "paso a paso" animado. No agrega peso al resto
	// del sitio (carrito, checkout, fichas de producto).
	if ( function_exists( 'is_front_page' ) && is_front_page() ) {
		wp_enqueue_script(
			'gsap',
			get_template_directory_uri() . '/assets/js/vendor/gsap/gsap.min.js',
			[],
			filemtime( get_template_directory() . '/assets/js/vendor/gsap/gsap.min.js' ),
			true
		);
		wp_enqueue_script(
			'gsap-scrolltrigger',
			get_template_directory_uri() . '/assets/js/vendor/gsap/ScrollTrigger.min.js',
			[ 'gsap' ],
			filemtime( get_template_directory() . '/assets/js/vendor/gsap/ScrollTrigger.min.js' ),
			true
		);
		wp_enqueue_script(
			'homefood-home-motion',
			get_template_directory_uri() . '/assets/js/home-motion.js',
			[ 'gsap', 'gsap-scrolltrigger' ],
			filemtime( get_template_directory() . '/assets/js/home-motion.js' ),
			true
		);
	}
} );

/**
 * El bloque de Gutenberg "woocommerce/related-products" (Product Collection con
 * preset "related") no está devolviendo productos reales en este sitio — muestra
 * contenido genérico de WordPress en vez de la lista de relacionados. En lugar de
 * seguir ajustando su configuración interna (ya causó problemas similares en
 * product-collection, ver commits anteriores), se reemplaza directo por la función
 * nativa de WooCommerce que arma "relacionados" — el mismo motor que usa el sistema
 * clásico, sin la capa experimental de bloques de por medio. Se resuelve vía el
 * mismo mecanismo de tokens que [[icon:...]]: el token se reemplaza en el render
 * final del bloque wp:html que lo contiene.
 */
function homefood_related_products_html() {
	if ( ! function_exists( 'wc_get_template' ) || ! is_product() ) {
		return '';
	}
	ob_start();
	woocommerce_related_products( [
		'posts_per_page' => 4,
		'columns'        => 4,
	] );
	return ob_get_clean();
}

add_filter( 'render_block', function ( $block_content ) {
	if ( is_admin() || empty( $block_content ) || strpos( $block_content, '[[related-products]]' ) === false ) {
		return $block_content;
	}
	return str_replace( '[[related-products]]', homefood_related_products_html(), $block_content );
}, 10, 1 );

/**
 * "Los platos que todos repiten" (home) pasó de una grilla estática a un carrusel
 * horizontal (autoplay + flechas + puntos, 4 tarjetas visibles en desktop). Se arma
 * con el shortcode clásico [best_selling_products] — el mismo motor de WooCommerce
 * que ya usan las cards de "relacionados" (ver homefood_related_products_html) — y
 * se le suma la clase de track del carrusel al <ul class="products"> que devuelve,
 * para no reimplementar el loop de productos a mano. Mismo mecanismo de tokens que
 * [[related-products]] / [[icon:...]].
 */
function homefood_bestsellers_carousel_html() {
	if ( ! shortcode_exists( 'best_selling_products' ) ) {
		return '';
	}

	$grid = do_shortcode( '[best_selling_products limit="12" columns="4"]' );
	if ( empty( $grid ) ) {
		return '';
	}

	$grid = preg_replace( '/<ul class="products([^"]*)"/', '<ul class="hf-product-carousel__track products$1"', $grid, 1 );

	ob_start();
	?>
	<div class="hf-product-carousel hf-reveal" data-hf-product-carousel>
		<div class="hf-product-carousel__viewport">
			<?php echo $grid; ?>
		</div>
		<div class="hf-carousel__controls">
			<button type="button" class="hf-carousel__arrow" data-hf-product-carousel-prev aria-label="Ver productos anteriores">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
			</button>
			<div class="hf-carousel__dots" data-hf-product-carousel-dots></div>
			<button type="button" class="hf-carousel__arrow" data-hf-product-carousel-next aria-label="Ver más productos">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
			</button>
		</div>
	</div>
	<?php
	return ob_get_clean();
}

add_filter( 'render_block', function ( $block_content ) {
	if ( is_admin() || empty( $block_content ) || strpos( $block_content, '[[bestsellers-carousel]]' ) === false ) {
		return $block_content;
	}
	return str_replace( '[[bestsellers-carousel]]', homefood_bestsellers_carousel_html(), $block_content );
}, 10, 1 );

/**
 * Los templates HTML de FSE (templates/*.html, parts/*.html) no ejecutan PHP, así que
 * cualquier href="/algo" quedaría hardcodeado a la raíz del dominio — rompe en el staging
 * (instalado en /homefood/) y en cualquier futuro subdirectorio. Se reescriben acá, en el
 * render final, contra home_url() real — funciona igual en staging y en producción sin
 * tocar un solo link a mano en el go-live (§8 de CLAUDE.md).
 */
add_filter( 'render_block', function ( $block_content, $block ) {
	if ( is_admin() || empty( $block_content ) || strpos( $block_content, 'href="/' ) === false ) {
		return $block_content;
	}

	$home = home_url( '/' );

	return preg_replace_callback(
		'/href="\/(?!\/)([^"]*)"/',
		function ( $matches ) use ( $home ) {
			return 'href="' . esc_url( $home . $matches[1] ) . '"';
		},
		$block_content
	);
}, 10, 2 );

/**
 * Set de íconos SVG (estilo Lucide, stroke, 24x24) para reemplazar emojis usados como
 * íconos funcionales — inconsistentes entre plataformas/fuentes y no themeables.
 * Los templates HTML de FSE no ejecutan PHP, así que se referencian con tokens
 * [[icon:nombre]] y se resuelven acá mismo, en el render final de cada bloque.
 */
function homefood_icon_svg( $name ) {
	$icons = [
		'truck'     => '<path d="M1 3h13v13H1z"/><path d="M14 8h4l4 4v4h-8V8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
		'salad'     => '<path d="M7 21h10"/><path d="M12 21a8 8 0 0 0 8-8H4a8 8 0 0 0 8 8Z"/><path d="M12 13V3"/><path d="M9 5 7 3"/><path d="M15 5l2-2"/><path d="M12 3c1 1 1 3 0 4"/>',
		'chef-hat'  => '<path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" x2="18" y1="17" y2="17"/>',
		'leaf'      => '<path d="M11 20A7 7 0 0 1 4 13c0-6 5-11 11-11 0 8-3 12-9 15Z"/><path d="M4 13c3 0 8-1 11-8"/>',
		'clock'     => '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
		'utensils'  => '<path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
		'package'   => '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
		'map-pin'   => '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
		'compass'   => '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
		'sunrise'   => '<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
		'sunset'    => '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
		'gift'      => '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8Z"/><path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8Z"/>',
		'dumbbell'  => '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>',
		'flame'     => '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
		'pizza'     => '<path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/>',
		'soup'      => '<path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 12V7a2 2 0 0 1 2-2h1v2"/><path d="M12 5V3"/><path d="M17 5v2"/>',
		'basket'    => '<path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="M4.5 15.5h15"/><path d="m5 11 4-7"/><path d="m9 11 1 9"/>',
		'calendar'  => '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h20"/>',
		'snowflake' => '<line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
		'microwave' => '<rect width="20" height="15" x="2" y="4" rx="2"/><rect width="8" height="7" x="6" y="8" rx="1"/><path d="M18 8v7"/><path d="M6 19v2"/><path d="M18 19v2"/>',
	];

	if ( ! isset( $icons[ $name ] ) ) {
		return '';
	}

	return '<svg class="hf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $icons[ $name ] . '</svg>';
}

add_filter( 'render_block', function ( $block_content ) {
	if ( is_admin() || empty( $block_content ) || strpos( $block_content, '[[' ) === false ) {
		return $block_content;
	}

	$block_content = preg_replace_callback(
		'/\[\[icon:([a-z-]+)\]\]/',
		function ( $matches ) {
			return homefood_icon_svg( $matches[1] );
		},
		$block_content
	);

	// [[img:archivo.ext]] → URL absoluta dentro de assets/images del tema. Mismo
	// criterio que el logo: la ruta se resuelve por PHP para ser portable entre
	// el staging (subcarpeta /homefood/) y producción (dominio raíz).
	return preg_replace_callback(
		'/\[\[img:([a-z0-9._\-]+)\]\]/',
		function ( $matches ) {
			return esc_url( get_template_directory_uri() . '/assets/images/' . $matches[1] );
		},
		$block_content
	);
}, 10, 1 );

/**
 * Botón flotante de WhatsApp nativo del tema — reemplaza al plugin "Click to Chat".
 * Se inyecta por wp_footer (no por un template part) para que aparezca en todo el
 * sitio sin depender de qué template esté activo. Mismo lenguaje visual que el
 * botón flotante del carrito (círculo, sombra, hover), un nivel arriba en la pila.
 */
add_action( 'wp_footer', function () {
	$phone = '5491157521076'; // +54 9 11 5752-1076
	$url   = 'https://wa.me/' . $phone;
	?>
	<a
		href="<?php echo esc_url( $url ); ?>"
		class="hf-whatsapp-fab"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Chatear por WhatsApp"
	>
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
		</svg>
	</a>
	<?php
}, 100 );
