<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

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

	wp_enqueue_script(
		'homefood-order-progress',
		get_template_directory_uri() . '/assets/js/order-progress.js',
		[],
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
} );

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
	];

	if ( ! isset( $icons[ $name ] ) ) {
		return '';
	}

	return '<svg class="hf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $icons[ $name ] . '</svg>';
}

add_filter( 'render_block', function ( $block_content ) {
	if ( is_admin() || empty( $block_content ) || strpos( $block_content, '[[icon:' ) === false ) {
		return $block_content;
	}

	return preg_replace_callback(
		'/\[\[icon:([a-z-]+)\]\]/',
		function ( $matches ) {
			return homefood_icon_svg( $matches[1] );
		},
		$block_content
	);
}, 10, 1 );
