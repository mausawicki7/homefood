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
			'a.wc-block-grid__product-link, ' +
			'.wc-block-components-product-image a, ' +
			'.wc-block-components-product-title a, ' +
			'.wp-block-post-title a, ' +
			'.woocommerce-loop-product__title a'
		);
		if ( ! link ) {
			// Fallback: primer <a> con href real dentro de la card.
			link = card.querySelector( 'a[href]:not(.add_to_cart_button):not(.added_to_cart)' );
		}
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
		// Devuelve el wrapper de más alto nivel que envuelve solo al botón, para
		// moverlo entero (así el <a> real de WooCommerce mantiene su contexto AJAX).
		return inner.closest( '.wp-block-woocommerce-product-button' )
			|| inner.closest( '.wc-block-components-product-button' )
			|| inner.closest( '.wc-block-grid__product-add-to-cart' )
			|| inner.closest( '.wp-block-button' )
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
		// comportamiento AJAX intacto) y agrega "Ver" al lado.
		var actions = document.createElement( 'div' );
		actions.className = 'hf-card-actions';
		addToCartWrap.parentNode.insertBefore( actions, addToCartWrap );
		actions.appendChild( addToCartWrap );

		// "Añadir al carrito" (o el nombre completo del producto que agrega el
		// markup de Blocks, ej. "Añadir «Pastel de papas» al carrito") es muy
		// largo para una card angosta con 2 botones y se desborda. Se acorta a
		// "Añadir" en cualquier variante de markup (clásico o Blocks) — el
		// add-to-cart AJAX usa data-attributes, no el texto, así que sigue
		// funcionando igual.
		var addBtn = actions.querySelector(
			'a.add_to_cart_button, .wc-block-components-product-button__button'
		);
		if ( addBtn && /carrito/i.test( addBtn.textContent ) ) {
			addBtn.textContent = 'Añadir';
		}

		var viewLink = document.createElement( 'a' );
		viewLink.className = 'hf-card-view-link';
		viewLink.href = permalink;
		viewLink.textContent = 'Ver';
		actions.appendChild( viewLink );
	}

	function scan() {
		document.querySelectorAll( '.wc-block-product, .wc-block-grid__product, ul.products li.product' ).forEach( enhanceCard );
	}

	document.addEventListener( 'DOMContentLoaded', scan );

	// Feedback de "Añadido" en el propio botón en vez del link "Ver carrito"
	// que WooCommerce inserta y que ocultamos por CSS (ver style.css) — evita
	// que la card cambie de alto en cada click mientras se arma el pedido.
	var FEEDBACK_TEXT = '✓ Añadido';
	var FEEDBACK_MS = 1600;

	function showAddedFeedback( button ) {
		if ( ! button ) return;
		if ( ! button.dataset.hfOriginalText ) {
			button.dataset.hfOriginalText = button.textContent;
		}
		clearTimeout( Number( button.dataset.hfFeedbackTimer ) || 0 );
		button.textContent = FEEDBACK_TEXT;
		var timer = setTimeout( function () {
			button.textContent = button.dataset.hfOriginalText;
		}, FEEDBACK_MS );
		button.dataset.hfFeedbackTimer = String( timer );
	}

	if ( window.jQuery ) {
		window.jQuery( document.body ).on( 'added_to_cart', function ( event, fragments, cartHash, $button ) {
			var button = $button && $button.length ? $button[ 0 ] : null;
			if ( button && button.closest( '.hf-card-actions' ) ) {
				showAddedFeedback( button );
			}
		} );
	}

	var scanTimer = null;
	var observer = new MutationObserver( function () {
		clearTimeout( scanTimer );
		scanTimer = setTimeout( scan, 150 );
	} );
	observer.observe( document.body, { childList: true, subtree: true } );
} )();
