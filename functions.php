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
