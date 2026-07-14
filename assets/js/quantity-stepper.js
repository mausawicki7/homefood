( function () {
	'use strict';

	function wrapInput( input ) {
		if ( input.closest( '.hf-qty-stepper' ) ) return; // ya envuelto

		var min = parseFloat( input.getAttribute( 'min' ) ) || 1;
		var max = input.getAttribute( 'max' ) ? parseFloat( input.getAttribute( 'max' ) ) : null;
		var step = parseFloat( input.getAttribute( 'step' ) ) || 1;

		var wrapper = document.createElement( 'div' );
		wrapper.className = 'hf-qty-stepper';

		var minus = document.createElement( 'button' );
		minus.type = 'button';
		minus.className = 'hf-qty-stepper__btn hf-qty-stepper__btn--minus';
		minus.setAttribute( 'aria-label', 'Restar cantidad' );
		minus.textContent = '−';

		var plus = document.createElement( 'button' );
		plus.type = 'button';
		plus.className = 'hf-qty-stepper__btn hf-qty-stepper__btn--plus';
		plus.setAttribute( 'aria-label', 'Sumar cantidad' );
		plus.textContent = '+';

		input.parentNode.insertBefore( wrapper, input );
		wrapper.appendChild( minus );
		wrapper.appendChild( input );
		wrapper.appendChild( plus );

		function currentValue() {
			var v = parseFloat( input.value );
			return isNaN( v ) ? min : v;
		}

		function setValue( v ) {
			if ( v < min ) v = min;
			if ( max !== null && v > max ) v = max;
			input.value = v;
			input.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		}

		minus.addEventListener( 'click', function () {
			setValue( currentValue() - step );
		} );
		plus.addEventListener( 'click', function () {
			setValue( currentValue() + step );
		} );
	}

	function scan() {
		document.querySelectorAll( '.quantity input.qty:not([type="hidden"])' ).forEach( wrapInput );
	}

	document.addEventListener( 'DOMContentLoaded', scan );

	// El carrito (WooCommerce Blocks) y el loop de productos re-renderizan sus
	// inputs de cantidad de forma dinámica (AJAX) — se re-escanea cuando cambian,
	// con debounce para no reaccionar a cada mutación individual del DOM.
	var scanTimer = null;
	var observer = new MutationObserver( function () {
		clearTimeout( scanTimer );
		scanTimer = setTimeout( scan, 150 );
	} );
	observer.observe( document.body, { childList: true, subtree: true } );
} )();
