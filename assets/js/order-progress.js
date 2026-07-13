( function () {
	'use strict';

	if ( typeof homefoodOrderRules === 'undefined' ) {
		return;
	}

	var MIN_TOTAL = homefoodOrderRules.minimumTotal;
	var CART_URL = homefoodOrderRules.storeApiCartUrl;

	function formatMoney( cents ) {
		var value = Math.round( cents / 100 );
		return '$' + value.toLocaleString( 'es-AR' );
	}

	function render( totalCents, itemCount ) {
		var total = totalCents / 100;
		var pct = Math.max( 0, Math.min( 100, ( total / MIN_TOTAL ) * 100 ) );
		var complete = total >= MIN_TOTAL;
		var remaining = Math.max( 0, MIN_TOTAL - total );

		document.querySelectorAll( '[data-hf-progress-fill]' ).forEach( function ( el ) {
			el.style.setProperty( '--hf-progress', pct + '%' );
		} );

		document.querySelectorAll( '[data-hf-progress-msg]' ).forEach( function ( el ) {
			el.textContent = complete
				? '¡Llegaste al mínimo de compra!'
				: 'Te faltan ' + formatMoney( remaining * 100 ) + ' para alcanzar el mínimo de $70.000.';
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

	function fetchCart() {
		fetch( CART_URL, { credentials: 'same-origin' } )
			.then( function ( res ) { return res.ok ? res.json() : null; } )
			.then( function ( data ) {
				if ( ! data ) return;
				var totalCents = parseInt( data.totals && data.totals.total_items || 0, 10 )
					+ parseInt( data.totals && data.totals.total_fees || 0, 10 );
				// total_items ya excluye envío/impuestos; usamos total del carrito completo si está disponible.
				var grandTotal = data.totals && data.totals.total_price
					? parseInt( data.totals.total_price, 10 )
					: totalCents;
				var itemCount = data.items_count || 0;
				render( grandTotal, itemCount );
			} )
			.catch( function () {} );
	}

	document.addEventListener( 'DOMContentLoaded', fetchCart );
	document.body.addEventListener( 'added_to_cart', fetchCart );
	document.body.addEventListener( 'wc-blocks_added_to_cart', fetchCart );
	document.body.addEventListener( 'wc-blocks_removed_from_cart', fetchCart );
	window.addEventListener( 'wc-blocks_cart_update', fetchCart );

	// Fallback: WooCommerce Blocks dispara actualizaciones vía CustomEvent en algunos hooks;
	// un polling liviano cubre casos donde el evento no se propaga (ej. actualizar cantidad).
	setInterval( fetchCart, 6000 );
} )();
