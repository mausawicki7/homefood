( function () {
	'use strict';

	if ( typeof homefoodOrderRules === 'undefined' ) {
		return;
	}

	var MIN_TOTAL = homefoodOrderRules.minimumTotal; // en pesos
	var CART_URL = homefoodOrderRules.storeApiCartUrl;
	var POLL_MS = 4000;

	function formatMoney( pesos ) {
		return '$' + Math.round( pesos ).toLocaleString( 'es-AR' );
	}

	function render( subtotalPesos, itemCount ) {
		var pct = MIN_TOTAL > 0
			? Math.max( 0, Math.min( 100, ( subtotalPesos / MIN_TOTAL ) * 100 ) )
			: 0;
		var complete = subtotalPesos >= MIN_TOTAL;
		var remaining = Math.max( 0, MIN_TOTAL - subtotalPesos );

		document.querySelectorAll( '[data-hf-progress-fill]' ).forEach( function ( el ) {
			el.style.setProperty( '--hf-progress', pct + '%' );
		} );

		document.querySelectorAll( '[data-hf-progress-msg]' ).forEach( function ( el ) {
			if ( itemCount === 0 ) {
				el.textContent = 'Armá tu pedido con al menos 7 viandas.';
			} else if ( complete ) {
				el.textContent = '¡Listo! Tu pedido ya alcanza el mínimo de compra.';
			} else {
				el.textContent = 'Te faltan ' + formatMoney( remaining ) +
					' para llegar al mínimo (aprox. 7 viandas).';
			}
		} );

		document.querySelectorAll( '[data-hf-progress-wrap]' ).forEach( function ( el ) {
			el.classList.toggle( 'is-complete', complete );
			el.classList.toggle( 'is-visible', itemCount > 0 );
		} );

		document.querySelectorAll( '[data-hf-cart-count]' ).forEach( function ( el ) {
			el.textContent = itemCount;
			el.style.display = itemCount > 0 ? 'flex' : 'none';
		} );
	}

	// A partir del objeto `totals` de la Store API / del data store, calcula el
	// subtotal en pesos y renderiza. El mínimo se valida contra total_items
	// (subtotal de viandas), NO contra total_price: este último incluye el envío.
	function renderFromTotals( totals, itemCount ) {
		var minorUnit = typeof totals.currency_minor_unit === 'number'
			? totals.currency_minor_unit
			: 2;
		var divisor = Math.pow( 10, minorUnit );
		var subtotalPesos = parseInt( totals.total_items || 0, 10 ) / divisor;
		render( subtotalPesos, itemCount || 0 );
	}

	// ====================================================================
	// Fuente 1 (preferida): data store de WooCommerce Blocks (`wc/store/cart`).
	// En las páginas de carrito y checkout, el bloque de WooCommerce mantiene el
	// carrito en un store en memoria; leerlo de ahí garantiza que el widget
	// muestre EXACTAMENTE lo mismo que ve el usuario. Evita el bug donde nuestro
	// fetch a la Store API devolvía un carrito viejo (cacheado por LiteSpeed o
	// con token de sesión distinto) mientras el bloque ya mostraba la cantidad
	// nueva — ej. carrito real de 7 viandas pero el widget calculando sobre 3.
	// ====================================================================
	var storeIsAuthoritative = false;

	function readStoreCart() {
		if ( ! window.wp || ! wp.data || ! wp.data.select ) return null;
		var sel = wp.data.select( 'wc/store/cart' );
		if ( ! sel || typeof sel.getCartData !== 'function' ) return null;
		// Solo confiamos en el store una vez que resolvió los datos reales; si
		// todavía no los pidió nadie, devuelve el carrito default (vacío) y no
		// debe pisar al fetch.
		if ( typeof sel.hasFinishedResolution === 'function'
			&& ! sel.hasFinishedResolution( 'getCartData' ) ) {
			return null;
		}
		var cart = sel.getCartData();
		return ( cart && cart.totals ) ? cart : null;
	}

	var lastSig = '';
	function renderFromStore() {
		var cart = readStoreCart();
		if ( ! cart ) return;
		storeIsAuthoritative = true;
		var sig = ( cart.itemsCount || 0 ) + '|' + ( cart.totals.total_items || '' );
		if ( sig === lastSig ) return; // sin cambios, no re-renderiza
		lastSig = sig;
		renderFromTotals( cart.totals, cart.itemsCount );
	}

	if ( window.wp && wp.data && typeof wp.data.subscribe === 'function' ) {
		wp.data.subscribe( renderFromStore );
	}

	// ====================================================================
	// Fuente 2 (fallback): GET a la Store API con cache-busting. Se usa en las
	// páginas donde el data store de Blocks no está cargado (home, catálogo,
	// ficha de producto). Se omite cuando el store ya es la fuente de verdad,
	// para no pisar el dato fresco con una respuesta potencialmente cacheada.
	// ====================================================================
	function fetchCart() {
		if ( storeIsAuthoritative ) return;
		var bust = CART_URL + ( CART_URL.indexOf( '?' ) === -1 ? '?' : '&' )
			+ '_hf=' + ( new Date() ).getTime();
		fetch( bust, {
			credentials: 'same-origin',
			cache: 'no-store',
			headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
		} )
			.then( function ( res ) { return res.ok ? res.json() : null; } )
			.then( function ( data ) {
				if ( ! data || ! data.totals ) return;
				if ( storeIsAuthoritative ) return; // por si el store resolvió mientras tanto
				renderFromTotals( data.totals, data.items_count );
			} )
			.catch( function () {} );
	}

	// Coalesce de disparos múltiples (varios eventos casi simultáneos) en una
	// sola petición para no golpear la Store API de más.
	var pending = false;
	function scheduleFetch() {
		if ( pending ) return;
		pending = true;
		setTimeout( function () { pending = false; fetchCart(); }, 150 );
	}

	document.addEventListener( 'DOMContentLoaded', function () {
		renderFromStore(); // intenta el store primero (carrito/checkout)
		fetchCart();        // fallback inmediato para el resto de páginas
	} );

	// Cobertura amplia de eventos: WooCommerce clásico + Blocks + side-cart
	// (Cart for WooCommerce / FunnelKit). Solo relevante en el modo fallback;
	// en carrito/checkout el store ya se encarga vía subscribe.
	[
		'added_to_cart', 'removed_from_cart', 'updated_cart_totals', 'updated_wc_div',
		'wc-blocks_added_to_cart', 'wc-blocks_removed_from_cart',
		'fkcart_cart_loaded', 'fkcart_after_add_to_cart', 'fkcart_cart_updated'
	].forEach( function ( ev ) {
		document.body.addEventListener( ev, scheduleFetch );
	} );
	window.addEventListener( 'wc-blocks_cart_update', scheduleFetch );

	// El badge del header suele quedar con un número viejo al volver a la página
	// desde el caché de "atrás/adelante" (bfcache), al reenfocar la pestaña o al
	// volver desde otra pestaña. Se refresca en esos momentos.
	window.addEventListener( 'pageshow', function ( e ) { if ( e.persisted ) { renderFromStore(); fetchCart(); } } );
	window.addEventListener( 'focus', scheduleFetch );
	document.addEventListener( 'visibilitychange', function () {
		if ( document.visibilityState === 'visible' ) { renderFromStore(); fetchCart(); }
	} );

	// Polling de respaldo para cambios que no dispararon ningún evento (solo
	// actúa en el modo fallback; en carrito/checkout no-opera).
	setInterval( fetchCart, POLL_MS );
} )();
