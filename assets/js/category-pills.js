( function () {
	'use strict';

	var wrap = document.querySelector( '[data-hf-cat-pills]' );
	if ( ! wrap ) return;

	var params = new URLSearchParams( window.location.search );
	var current = params.get( 'product_cat' ) || '';

	wrap.querySelectorAll( '.hf-cat-pill' ).forEach( function ( pill ) {
		pill.classList.toggle( 'is-active', pill.getAttribute( 'data-cat' ) === current );
	} );
} )();
