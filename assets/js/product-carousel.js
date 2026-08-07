( function () {
	'use strict';

	var root = document.querySelector( '[data-hf-product-carousel]' );
	if ( ! root ) return;

	var track = root.querySelector( '.hf-product-carousel__track' );
	var dotsWrap = root.querySelector( '[data-hf-product-carousel-dots]' );
	var prevBtn = root.querySelector( '[data-hf-product-carousel-prev]' );
	var nextBtn = root.querySelector( '[data-hf-product-carousel-next]' );
	var reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	if ( ! track ) return;
	var slides = Array.prototype.slice.call( track.children );
	if ( ! slides.length ) return;

	var index = 0;
	var maxIndex = 0;
	var timer = null;

	function itemsPerView() {
		if ( window.matchMedia( '(max-width: 640px)' ).matches ) return 1;
		if ( window.matchMedia( '(max-width: 900px)' ).matches ) return 2;
		return 4;
	}

	// Desplaza de a 1 tarjeta por vez (no de a página). Se mide la posición real
	// en el DOM en vez de usar porcentajes fijos, para que el paso sea exacto sin
	// importar el gap entre tarjetas ni el breakpoint actual. getBoundingClientRect
	// (en vez de offsetLeft, que redondea a pixel entero) evita el desfasaje
	// sub-pixel que iba acumulándose de a poco y dejaba asomar una línea de la
	// tarjeta anterior/siguiente después de varios "Next" — el transform actual
	// del track afecta a ambas mediciones por igual, así que se cancela al restar.
	function offsetFor( i ) {
		if ( ! slides[ i ] ) return 0;
		return slides[ i ].getBoundingClientRect().left - slides[ 0 ].getBoundingClientRect().left;
	}

	function buildDots() {
		dotsWrap.innerHTML = '';
		for ( var i = 0; i <= maxIndex; i++ ) {
			( function ( dotIndex ) {
				var dot = document.createElement( 'button' );
				dot.type = 'button';
				dot.className = 'hf-carousel__dot';
				dot.setAttribute( 'aria-label', 'Ir al plato ' + ( dotIndex + 1 ) );
				dot.addEventListener( 'click', function () {
					goTo( dotIndex );
					restartAutoplay();
				} );
				dotsWrap.appendChild( dot );
			} )( i );
		}
	}

	function update() {
		track.style.transform = 'translateX(-' + offsetFor( index ) + 'px)';
		Array.prototype.forEach.call( dotsWrap.children, function ( dot, i ) {
			dot.classList.toggle( 'is-active', i === index );
		} );
	}

	function goTo( i ) {
		index = ( i + maxIndex + 1 ) % ( maxIndex + 1 );
		update();
	}

	function next() { goTo( index + 1 ); }
	function prev() { goTo( index - 1 ); }

	function restartAutoplay() {
		if ( reduceMotion || maxIndex <= 0 ) return;
		clearInterval( timer );
		timer = setInterval( next, 4000 );
	}

	function recalc() {
		var newMaxIndex = Math.max( 0, slides.length - itemsPerView() );
		if ( newMaxIndex !== maxIndex ) {
			maxIndex = newMaxIndex;
			index = Math.min( index, maxIndex );
			buildDots();
		}
		update();
		restartAutoplay();
	}

	prevBtn.addEventListener( 'click', function () { prev(); restartAutoplay(); } );
	nextBtn.addEventListener( 'click', function () { next(); restartAutoplay(); } );

	root.addEventListener( 'mouseenter', function () { clearInterval( timer ); } );
	root.addEventListener( 'mouseleave', restartAutoplay );
	root.addEventListener( 'focusin', function () { clearInterval( timer ); } );
	root.addEventListener( 'focusout', restartAutoplay );

	// Swipe táctil
	var startX = null;
	track.addEventListener( 'touchstart', function ( e ) { startX = e.touches[0].clientX; }, { passive: true } );
	track.addEventListener( 'touchend', function ( e ) {
		if ( startX === null ) return;
		var delta = e.changedTouches[0].clientX - startX;
		if ( Math.abs( delta ) > 40 ) {
			delta < 0 ? next() : prev();
			restartAutoplay();
		}
		startX = null;
	} );

	var resizeTimer = null;
	window.addEventListener( 'resize', function () {
		clearTimeout( resizeTimer );
		resizeTimer = setTimeout( recalc, 150 );
	} );

	maxIndex = Math.max( 0, slides.length - itemsPerView() );
	buildDots();
	update();
	restartAutoplay();
} )();
