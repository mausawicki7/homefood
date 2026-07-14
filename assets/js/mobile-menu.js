( function () {
	'use strict';

	var toggle = document.querySelector( '[data-hf-menu-toggle]' );
	var nav = document.querySelector( '[data-hf-mobile-nav]' );
	var header = document.querySelector( '.hf-header' );

	if ( ! toggle || ! nav ) {
		return;
	}

	function syncHeaderHeight() {
		if ( header ) {
			document.documentElement.style.setProperty( '--hf-header-h', header.offsetHeight + 'px' );
		}
	}
	syncHeaderHeight();
	window.addEventListener( 'resize', syncHeaderHeight );

	function closeNav() {
		nav.classList.remove( 'is-open' );
		toggle.setAttribute( 'aria-expanded', 'false' );
		document.body.classList.remove( 'hf-no-scroll' );
	}

	function toggleNav() {
		var isOpen = nav.classList.toggle( 'is-open' );
		toggle.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );
		document.body.classList.toggle( 'hf-no-scroll', isOpen );
	}

	toggle.addEventListener( 'click', toggleNav );

	nav.querySelectorAll( 'a' ).forEach( function ( link ) {
		link.addEventListener( 'click', closeNav );
	} );

	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' ) closeNav();
	} );

	window.addEventListener( 'resize', function () {
		if ( window.innerWidth > 900 ) closeNav();
	} );
} )();
