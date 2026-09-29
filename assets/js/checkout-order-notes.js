( function () {
	'use strict';

	// Notas del pedido en el checkout de bloques. WooCommerce las muestra detrás
	// de una casilla "Añadir una nota a tu pedido" y el bloque no tiene opciones
	// de título ni descripción. Acá se abre la nota sola (se marca la casilla, que
	// queda oculta por CSS), se le agrega título + texto de ayuda con el mismo
	// markup que los otros pasos del checkout, y se cambia el placeholder.
	// Lo escrito se guarda como la nota del cliente del pedido, igual que antes.

	var TITLE = 'Notas del pedido';
	var HINT = '¿Hay algo que nos quieras contar? Escribinos cómo llegar, a quién dejarle el pedido o cualquier detalle que nos ayude a que tus viandas lleguen como te gusta.';
	var PLACEHOLDER = 'Ej.: tocar el timbre 3B, dejarlo en portería o avisar antes de llegar.';

	function enhance() {
		var step = document.querySelector( '.wc-block-checkout__order-notes' );
		if ( ! step ) {
			return;
		}

		// La casilla es un CheckboxControl de React: un click real dispara su
		// onChange y renderiza el textarea. Si el checkout está procesando, la
		// casilla está deshabilitada y el click no hace nada; se reintenta en la
		// próxima mutación del DOM.
		var checkbox = step.querySelector( '.wc-block-checkout__add-note input[type="checkbox"]' );
		if ( checkbox && ! checkbox.checked && ! checkbox.disabled ) {
			checkbox.click();
		}

		if ( ! step.querySelector( '.hf-order-notes__heading' ) ) {
			var heading = document.createElement( 'div' );
			heading.className = 'wc-block-components-checkout-step__heading-container hf-order-notes__heading';
			heading.innerHTML =
				'<div class="wc-block-components-checkout-step__heading">' +
					'<h2 class="wc-block-components-title wc-block-components-checkout-step__title" id="hf-order-notes-title"></h2>' +
				'</div>' +
				'<p class="hf-order-notes__hint" id="hf-order-notes-hint"></p>';
			heading.querySelector( 'h2' ).textContent = TITLE;
			heading.querySelector( 'p' ).textContent = HINT;
			step.insertBefore( heading, step.querySelector( '.wc-block-components-checkout-step__content' ) || step.firstChild );
		}

		var textarea = step.querySelector( 'textarea' );
		if ( textarea && ! textarea.hasAttribute( 'data-hf-enhanced' ) ) {
			textarea.setAttribute( 'data-hf-enhanced', '' );
			textarea.setAttribute( 'placeholder', PLACEHOLDER );
			textarea.setAttribute( 'aria-labelledby', 'hf-order-notes-title' );
			textarea.setAttribute( 'aria-describedby', 'hf-order-notes-hint' );
		}
	}

	// El checkout se renderiza con React después de la carga (y puede volver a
	// montar el paso), así que se observa el DOM en vez de correr una sola vez.
	// enhance() es idempotente: sus propias inserciones no vuelven a modificar nada.
	new MutationObserver( enhance ).observe( document.body, { childList: true, subtree: true } );
	enhance();
} )();
