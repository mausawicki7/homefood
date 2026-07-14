( function () {
	'use strict';

	var TAGLINES = {
		clasicos: 'Sabor casero de toda la vida.',
		combos: 'Variedad lista para toda la semana.',
		fitness: 'Alto en proteína, bajo esfuerzo.',
		keto: 'Sabor real, bajo en carbohidratos.',
		'ensaladas-y-omelettes': 'Fresco, liviano y rendidor.',
		'emp-pizza': 'Un clásico que nunca falla.',
		vegetariano: '100% vegetal, 100% sabor.',
	};
	var DEFAULT_TAGLINE = 'Casero, rico y listo para calentar.';

	function findPermalink( card ) {
		var link = card.querySelector(
			'a.woocommerce-loop-product__link, ' +
			'.wc-block-components-product-image a, ' +
			'.wc-block-components-product-title a, ' +
			'.wp-block-post-title a, ' +
			'.woocommerce-loop-product__title a'
		);
		return link ? link.getAttribute( 'href' ) : null;
	}

	function findCategorySlug( card ) {
		var match = card.className.match( /product_cat-([a-z0-9-]+)/ );
		return match ? match[1] : null;
	}

	function findAddToCartWrap( card ) {
		var inner = card.querySelector(
			'a.add_to_cart_button, ' +
			'a.button.product_type_simple, ' +
			'.wc-block-components-product-button__button, ' +
			'.wp-block-woocommerce-product-button a, ' +
			'.wp-block-woocommerce-product-button button'
		);
		if ( ! inner ) return null;
		return inner.closest( '.wp-block-woocommerce-product-button' )
			|| inner.closest( '.wc-block-components-product-button' )
			|| inner;
	}

	function enhanceCard( card ) {
		if ( card.hasAttribute( 'data-hf-card-done' ) ) return;

		var permalink = findPermalink( card );
		var addToCartWrap = findAddToCartWrap( card );
		if ( ! permalink || ! addToCartWrap ) return; // faltan piezas necesarias, no tocar nada

		card.setAttribute( 'data-hf-card-done', '1' );

		// Tagline corta según categoría (si el bloque expone la clase product_cat-*).
		var slug = findCategorySlug( card );
		var tagline = document.createElement( 'p' );
		tagline.className = 'hf-card-tagline';
		tagline.textContent = TAGLINES[ slug ] || DEFAULT_TAGLINE;
		var priceEl = card.querySelector( '.wc-block-components-product-price, .price' );
		if ( priceEl && priceEl.parentNode ) {
			priceEl.parentNode.insertBefore( tagline, priceEl );
		}

		// Fila de acciones: mueve el botón real de WooCommerce (conserva su
		// comportamiento AJAX intacto) y agrega "Ver producto" al lado.
		var actions = document.createElement( 'div' );
		actions.className = 'hf-card-actions';
		addToCartWrap.parentNode.insertBefore( actions, addToCartWrap );
		actions.appendChild( addToCartWrap );

		var viewLink = document.createElement( 'a' );
		viewLink.className = 'hf-card-view-link';
		viewLink.href = permalink;
		viewLink.textContent = 'Ver producto';
		actions.appendChild( viewLink );
	}

	function scan() {
		document.querySelectorAll( '.wc-block-product, .wc-block-grid__product, ul.products li.product' ).forEach( enhanceCard );
	}

	document.addEventListener( 'DOMContentLoaded', scan );

	var scanTimer = null;
	var observer = new MutationObserver( function () {
		clearTimeout( scanTimer );
		scanTimer = setTimeout( scan, 150 );
	} );
	observer.observe( document.body, { childList: true, subtree: true } );
} )();
