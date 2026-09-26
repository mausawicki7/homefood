/**
 * Video de fondo del hero — solo escritorio (>900px, mismo corte que el CSS).
 * El <video> llega sin fuentes: acá se le cargan únicamente si el viewport es de
 * escritorio, así mobile nunca descarga los ~3,6 MB. Con prefers-reduced-motion
 * se muestra solo el poster (primer cuadro), sin reproducir.
 */
( function () {
	var video = document.querySelector( '[data-hf-hero-video]' );
	var cfg = window.hfHeroVideo;
	if ( ! video || ! cfg ) return;

	var hero = video.closest( '.hf-hero-slider' );
	var desktop = window.matchMedia( '(min-width: 901px)' );
	var reducedMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' );
	var loaded = false;

	function load() {
		if ( loaded ) return;
		loaded = true;
		video.poster = cfg.poster;
		if ( reducedMotion.matches ) {
			hero.classList.add( 'has-video' );
			return;
		}
		[ [ cfg.webm, 'video/webm' ], [ cfg.mp4, 'video/mp4' ] ].forEach( function ( src ) {
			var source = document.createElement( 'source' );
			source.src = src[ 0 ];
			source.type = src[ 1 ];
			video.appendChild( source );
		} );
		video.addEventListener( 'playing', function () {
			hero.classList.add( 'has-video' );
		}, { once: true } );
		video.load();
	}

	function sync() {
		if ( ! desktop.matches ) {
			if ( loaded ) video.pause();
			return;
		}
		load();
		if ( ! reducedMotion.matches ) {
			var p = video.play();
			if ( p && p.catch ) p.catch( function () {} ); // autoplay bloqueado: quedan las fotos
		}
	}

	sync();
	if ( desktop.addEventListener ) desktop.addEventListener( 'change', sync );

	// No gastar CPU/batería con el hero fuera de pantalla.
	if ( 'IntersectionObserver' in window ) {
		new IntersectionObserver( function ( entries ) {
			if ( ! desktop.matches || reducedMotion.matches || ! loaded ) return;
			if ( entries[ 0 ].isIntersecting ) {
				var p = video.play();
				if ( p && p.catch ) p.catch( function () {} );
			} else {
				video.pause();
			}
		} ).observe( hero );
	}
} )();
