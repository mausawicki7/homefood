( function () {
	'use strict';

	// No depende de GSAP: corre siempre, incluso si el resto de este archivo
	// se corta más abajo por falta de GSAP.
	initZonesMap();

	// Sin GSAP no hay nada más que hacer acá — el resto de home-motion.js es
	// una mejora progresiva: si el script no carga, el hero muestra el slide 1
	// fijo (CSS puro) y el resto del home se ve igual que antes, sin reveals.
	if ( typeof window.gsap === 'undefined' ) return;

	var reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';
	if ( hasScrollTrigger ) gsap.registerPlugin( ScrollTrigger );

	initHeroSlider();

	if ( hasScrollTrigger && ! reduceMotion ) {
		initScrollReveal();
		initJourney();
	}

	/* ======================================================================
	   Hero slider
	   ====================================================================== */
	function initHeroSlider() {
		var root = document.querySelector( '[data-hf-hero-slider]' );
		if ( ! root ) return;

		var slides = Array.prototype.slice.call( root.querySelectorAll( '[data-hf-hero-slide]' ) );
		if ( slides.length < 2 ) {
			if ( slides.length === 1 ) animateSlideIn( slides[0], true );
			return;
		}

		var dotsWrap = root.querySelector( '[data-hf-hero-slider-dots]' );
		var prevBtn = root.querySelector( '[data-hf-hero-slider-prev]' );
		var nextBtn = root.querySelector( '[data-hf-hero-slider-next]' );
		var index = Math.max( 0, slides.findIndex( function ( s ) { return s.classList.contains( 'is-active' ); } ) );
		var timer = null;
		var kenBurnsTween = null;
		var AUTOPLAY_MS = 6500;

		slides.forEach( function ( slide, i ) {
			var dot = document.createElement( 'button' );
			dot.type = 'button';
			dot.className = 'hf-hero-slider__dot';
			dot.setAttribute( 'aria-label', 'Ir al slide ' + ( i + 1 ) );
			dot.addEventListener( 'click', function () { goTo( i ); restartAutoplay(); } );
			dotsWrap.appendChild( dot );
		} );
		var dots = Array.prototype.slice.call( dotsWrap.children );

		function setActiveA11y( slide, isActive ) {
			slide.setAttribute( 'aria-hidden', isActive ? 'false' : 'true' );
			Array.prototype.forEach.call( slide.querySelectorAll( 'a, button' ), function ( el ) {
				if ( isActive ) el.removeAttribute( 'tabindex' );
				else el.setAttribute( 'tabindex', '-1' );
			} );
		}

		function animateSlideIn( slide, immediate ) {
			var bg = slide.querySelector( '[data-hf-hero-slide-bg]' );
			var anims = slide.querySelectorAll( '[data-hf-anim]' );

			if ( reduceMotion ) return;

			if ( kenBurnsTween ) kenBurnsTween.kill();
			if ( bg ) {
				// 1.05 en vez de 1.08: un zoom más sutil hace menos perceptible
				// cualquier resto de "temblor" al escalar la textura de fondo.
				gsap.set( bg, { scale: 1 } );
				kenBurnsTween = gsap.to( bg, { scale: 1.05, duration: AUTOPLAY_MS / 1000 + 2, ease: 'none' } );
			}

			gsap.killTweensOf( anims );
			gsap.set( anims, { opacity: 0, y: 22 } );
			gsap.to( anims, {
				opacity: 1,
				y: 0,
				duration: 0.7,
				ease: 'power2.out',
				stagger: 0.09,
				delay: immediate ? 0.15 : 0.05,
			} );
		}

		function goTo( i ) {
			var next = ( i + slides.length ) % slides.length;
			if ( next === index ) return;
			setActiveA11y( slides[ index ], false );
			slides[ index ].classList.remove( 'is-active' );
			slides[ next ].classList.add( 'is-active' );
			setActiveA11y( slides[ next ], true );
			dots.forEach( function ( dot, di ) { dot.classList.toggle( 'is-active', di === next ); } );
			index = next;
			animateSlideIn( slides[ index ], false );
		}

		function next() { goTo( index + 1 ); }
		function prev() { goTo( index - 1 ); }

		function restartAutoplay() {
			if ( reduceMotion ) return;
			clearInterval( timer );
			timer = setInterval( next, AUTOPLAY_MS );
		}

		prevBtn.addEventListener( 'click', function () { prev(); restartAutoplay(); } );
		nextBtn.addEventListener( 'click', function () { next(); restartAutoplay(); } );
		root.addEventListener( 'mouseenter', function () { clearInterval( timer ); } );
		root.addEventListener( 'mouseleave', restartAutoplay );
		root.addEventListener( 'focusin', function () { clearInterval( timer ); } );
		root.addEventListener( 'focusout', restartAutoplay );

		// Swipe táctil, mismo criterio que testimonial-carousel.js
		var startX = null;
		root.addEventListener( 'touchstart', function ( e ) { startX = e.touches[0].clientX; }, { passive: true } );
		root.addEventListener( 'touchend', function ( e ) {
			if ( startX === null ) return;
			var delta = e.changedTouches[0].clientX - startX;
			if ( Math.abs( delta ) > 40 ) {
				delta < 0 ? next() : prev();
				restartAutoplay();
			}
			startX = null;
		} );

		slides.forEach( function ( slide, i ) { setActiveA11y( slide, i === index ); } );
		dots.forEach( function ( dot, di ) { dot.classList.toggle( 'is-active', di === index ); } );

		animateSlideIn( slides[ index ], true );
		restartAutoplay();
	}

	/* ======================================================================
	   Scroll-reveal genérico: elementos sueltos con .hf-reveal (fade+rise
	   individual) y contenedores [data-hf-reveal-group] (stagger de hijos).
	   El estado oculto se aplica acá mismo, no en CSS: si este script no corre,
	   el contenido nunca queda invisible.
	   ====================================================================== */
	function initScrollReveal() {
		var singles = document.querySelectorAll( '.hf-reveal' );
		singles.forEach( function ( el ) {
			gsap.set( el, { opacity: 0, y: 24 } );
			ScrollTrigger.create( {
				trigger: el,
				start: 'top 85%',
				once: true,
				onEnter: function () {
					gsap.to( el, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' } );
				},
			} );
		} );

		var groups = document.querySelectorAll( '[data-hf-reveal-group]' );
		groups.forEach( function ( group ) {
			var items = Array.prototype.slice.call( group.children );
			if ( ! items.length ) return;
			gsap.set( items, { opacity: 0, y: 24 } );
			ScrollTrigger.create( {
				trigger: group,
				start: 'top 85%',
				once: true,
				onEnter: function () {
					gsap.to( items, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.08 } );
				},
			} );
		} );
	}

	/* ======================================================================
	   "Tu pedido, paso a paso": journey vertical alternado. Cada paso entra
	   por separado al pisar el viewport — el ícono/placeholder desliza desde
	   su lado (izquierda o derecha según el paso), el texto desde el lado
	   opuesto, y el numerito hace un pop. Además, una barra sólida "carga"
	   hacia abajo por encima del track punteado a medida que se hace scroll,
	   con un cursor que arranca mostrando "1" (el mismo numerito de arriba) y
	   se "transforma" en el siguiente número apenas el scroll lo hace chocar
	   contra ese hito — con un pequeño rebote de escala en el momento del
	   impacto — dando el efecto de una bola empujando a la siguiente.
	   ====================================================================== */
	function initJourney() {
		var journey = document.querySelector( '[data-hf-journey]' );
		var steps = document.querySelectorAll( '[data-hf-journey-step]' );
		steps.forEach( function ( step ) {
			var media = step.querySelector( '.hf-journey__media' );
			var content = step.querySelector( '.hf-journey__content' );
			var badge = step.querySelector( '.hf-journey__badge' );
			var mediaOnLeft = step.classList.contains( 'hf-journey__step--media-left' );

			gsap.set( media, { opacity: 0, x: mediaOnLeft ? -36 : 36 } );
			gsap.set( content, { opacity: 0, x: mediaOnLeft ? 36 : -36 } );
			gsap.set( badge, { opacity: 0, scale: 0.5 } );

			ScrollTrigger.create( {
				trigger: step,
				start: 'top 78%',
				once: true,
				onEnter: function () {
					gsap.to( badge, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' } );
					gsap.to( [ media, content ], { opacity: 1, x: 0, duration: 0.7, ease: 'power2.out', stagger: 0.1 } );
				},
			} );
		} );

		if ( ! journey ) return;
		var fill = journey.querySelector( '[data-hf-journey-fill]' );
		var cursor = journey.querySelector( '[data-hf-journey-cursor]' );
		var badges = Array.prototype.slice.call( journey.querySelectorAll( '.hf-journey__badge' ) );
		if ( ! fill || ! cursor || ! badges.length ) return;

		// Posición de cada numerito como fracción (0-1) del alto de .hf-journey
		// — la misma escala en la que se mueve el cursor (top: 0% a 100% de
		// ese mismo contenedor), así se puede comparar directo contra
		// self.progress más abajo sin conversiones.
		var journeyTop = journey.getBoundingClientRect().top + window.pageYOffset;
		var journeyHeight = journey.offsetHeight;
		var thresholds = badges.map( function ( b, i ) {
			var badgeTop = b.getBoundingClientRect().top + window.pageYOffset;
			return { number: i + 1, fraction: ( badgeTop - journeyTop ) / journeyHeight };
		} );

		var currentNumber = 1;
		cursor.textContent = '1';

		// Mismo trigger/scrub en ambos tweens para que la barra y el cursor
		// avancen exactamente sincronizados, del primer al último paso.
		var scrollCfg = { trigger: journey, start: 'top 70%', end: 'bottom 30%', scrub: 0.5 };
		gsap.set( fill, { scaleY: 0 } );
		gsap.set( cursor, { top: '0%' } );
		gsap.to( fill, { scaleY: 1, ease: 'none', scrollTrigger: scrollCfg } );
		gsap.to( cursor, { top: '100%', ease: 'none', scrollTrigger: scrollCfg } );

		// Instancia separada solo para el "choque": self.progress (0-1 sobre
		// el mismo start/end de arriba) equivale exactamente a la fracción de
		// altura que ya alcanzó el cursor, porque su tween de "top" escala
		// linealmente 0%→100% sobre ese mismo rango.
		ScrollTrigger.create( {
			trigger: journey,
			start: 'top 70%',
			end: 'bottom 30%',
			scrub: 0.5,
			onUpdate: function ( self ) {
				var hit = 1;
				thresholds.forEach( function ( t ) {
					if ( self.progress >= t.fraction ) hit = t.number;
				} );
				if ( hit !== currentNumber ) {
					currentNumber = hit;
					cursor.textContent = String( hit );
					gsap.fromTo( cursor, { scale: 1.35 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' } );
				}
			},
		} );
	}

	/* ======================================================================
	   Mapa de zonas de envío: en mobile el iframe es más angosto y, al mismo
	   nivel de zoom que desktop, muestra una porción más chica del área de
	   cobertura. Se swapea el src por una versión con menos zoom (mismo mid,
	   z más bajo) solo si el viewport arranca en mobile — no hay resize
	   listener a propósito, evita recargar el iframe si el usuario solo gira
	   el celular o cambia el tamaño de la ventana.
	   ====================================================================== */
	function initZonesMap() {
		var iframe = document.querySelector( '[data-hf-zones-map]' );
		if ( ! iframe ) return;
		var mobileSrc = iframe.getAttribute( 'data-src-mobile' );
		if ( ! mobileSrc ) return;
		if ( window.matchMedia( '(max-width: 900px)' ).matches ) {
			iframe.src = mobileSrc;
		}
	}
} )();
