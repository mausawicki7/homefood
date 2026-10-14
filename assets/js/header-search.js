/**
 * Buscador de platos en el header.
 *
 * La lupa abre un panel debajo de la barra. Mientras se escribe, se consultan
 * los productos en la Store API de WooCommerce (los más vendidos primero) y se
 * listan con foto y precio. Enter sin elegir un resultado envía el form a la
 * búsqueda nativa (/?s=…&post_type=product), que muestra archive-product.html.
 * Sin JS el panel queda oculto y el resto del header funciona igual.
 */
( function () {
	'use strict';

	if ( typeof homefoodSearch === 'undefined' ) {
		return;
	}

	var toggle = document.querySelector( '[data-hf-search-toggle]' );
	var panel = document.querySelector( '[data-hf-search]' );
	if ( ! toggle || ! panel ) {
		return;
	}

	var form = panel.querySelector( '[data-hf-search-form]' );
	var input = panel.querySelector( '[data-hf-search-input]' );
	var list = panel.querySelector( '[data-hf-search-results]' );
	var status = panel.querySelector( '[data-hf-search-status]' );
	var closeBtn = panel.querySelector( '[data-hf-search-close]' );

	var MIN_CHARS = 2;
	var DEBOUNCE_MS = 250;
	var PER_PAGE = 6;

	var timer = null;
	var controller = null;
	var activeIndex = -1;

	function isOpen() {
		return ! panel.hidden;
	}

	function open() {
		// Si el menú mobile está abierto, se cierra para no apilar paneles.
		var mobileToggle = document.querySelector( '[data-hf-menu-toggle][aria-expanded="true"]' );
		if ( mobileToggle ) {
			mobileToggle.click();
		}
		panel.hidden = false;
		toggle.setAttribute( 'aria-expanded', 'true' );
		input.focus();
	}

	function close( returnFocus ) {
		panel.hidden = true;
		toggle.setAttribute( 'aria-expanded', 'false' );
		if ( returnFocus ) {
			toggle.focus();
		}
	}

	function searchUrl( term ) {
		return homefoodSearch.searchUrl + '?s=' + encodeURIComponent( term ) + '&post_type=product';
	}

	function decodeEntities( html ) {
		return new DOMParser().parseFromString( html, 'text/html' ).documentElement.textContent;
	}

	function formatMoney( prices ) {
		var value = parseInt( prices.price, 10 ) / Math.pow( 10, prices.currency_minor_unit || 0 );
		return '$' + Math.round( value ).toLocaleString( 'es-AR' );
	}

	// Sin tildes ni mayúsculas, para resaltar "pure" dentro de "Puré".
	// NFD + quitar diacríticos no cambia el largo de un texto en NFC, así que
	// los índices sirven sobre el original.
	function fold( text ) {
		return text.normalize( 'NFC' ).normalize( 'NFD' ).replace( /[̀-ͯ]/g, '' ).toLowerCase();
	}

	function highlighted( text, term ) {
		var frag = document.createDocumentFragment();
		text = text.normalize( 'NFC' );
		var at = fold( text ).indexOf( fold( term ) );
		if ( at === -1 ) {
			frag.appendChild( document.createTextNode( text ) );
			return frag;
		}
		var mark = document.createElement( 'mark' );
		mark.textContent = text.slice( at, at + term.length );
		frag.appendChild( document.createTextNode( text.slice( 0, at ) ) );
		frag.appendChild( mark );
		frag.appendChild( document.createTextNode( text.slice( at + term.length ) ) );
		return frag;
	}

	function options() {
		return list.querySelectorAll( '[role="option"]' );
	}

	function setActive( index ) {
		var opts = options();
		activeIndex = opts.length ? ( index + opts.length ) % opts.length : -1;
		opts.forEach( function ( opt, i ) {
			opt.setAttribute( 'aria-selected', i === activeIndex ? 'true' : 'false' );
		} );
		if ( activeIndex >= 0 ) {
			input.setAttribute( 'aria-activedescendant', opts[ activeIndex ].id );
			opts[ activeIndex ].scrollIntoView( { block: 'nearest' } );
		} else {
			input.removeAttribute( 'aria-activedescendant' );
		}
	}

	function clearResults() {
		list.innerHTML = '';
		list.hidden = true;
		input.setAttribute( 'aria-expanded', 'false' );
		setActive( -1 );
	}

	function option( id, href, className ) {
		var li = document.createElement( 'li' );
		li.id = id;
		li.setAttribute( 'role', 'option' );
		li.setAttribute( 'aria-selected', 'false' );
		if ( className ) {
			li.className = className;
		}
		var a = document.createElement( 'a' );
		a.href = href;
		a.tabIndex = -1;
		li.appendChild( a );
		return li;
	}

	function render( products, term ) {
		clearResults();

		if ( ! products.length ) {
			status.textContent = 'No encontramos platos con «' + term + '». Probá con otra palabra o mirá ';
			var link = document.createElement( 'a' );
			link.href = homefoodSearch.shopUrl;
			link.textContent = 'todas las viandas';
			status.appendChild( link );
			status.appendChild( document.createTextNode( '.' ) );
			return;
		}

		products.forEach( function ( p, i ) {
			var li = option( 'hf-search-opt-' + i, p.permalink );
			var a = li.firstChild;

			var thumb = p.images && p.images[ 0 ] ? p.images[ 0 ].thumbnail : '';
			if ( thumb ) {
				var img = document.createElement( 'img' );
				img.src = thumb;
				img.alt = '';
				img.width = 56;
				img.height = 56;
				img.loading = 'lazy';
				a.appendChild( img );
			} else {
				var ph = document.createElement( 'span' );
				ph.className = 'hf-search__thumb-empty';
				a.appendChild( ph );
			}

			var name = document.createElement( 'span' );
			name.className = 'hf-search__name';
			name.appendChild( highlighted( decodeEntities( p.name ), term ) );
			a.appendChild( name );

			var price = document.createElement( 'span' );
			price.className = 'hf-search__price';
			price.textContent = formatMoney( p.prices );
			a.appendChild( price );

			list.appendChild( li );
		} );

		var all = option( 'hf-search-opt-all', searchUrl( term ), 'hf-search__all' );
		all.firstChild.textContent = 'Ver todos los resultados para «' + term + '»';
		list.appendChild( all );

		list.hidden = false;
		input.setAttribute( 'aria-expanded', 'true' );
		status.textContent = products.length === 1
			? '1 plato encontrado.'
			: products.length + ' platos encontrados.';
	}

	function search( term ) {
		if ( controller ) {
			controller.abort();
		}
		controller = typeof AbortController !== 'undefined' ? new AbortController() : null;

		panel.classList.add( 'is-loading' );

		var url = homefoodSearch.storeApiUrl +
			'?search=' + encodeURIComponent( term ) +
			'&per_page=' + PER_PAGE +
			'&orderby=popularity&order=desc';

		fetch( url, { credentials: 'same-origin', signal: controller ? controller.signal : undefined } )
			.then( function ( res ) {
				if ( ! res.ok ) {
					throw new Error( 'HTTP ' + res.status );
				}
				return res.json();
			} )
			.then( function ( products ) {
				// Si mientras tanto se siguió escribiendo, esta respuesta ya no sirve.
				if ( input.value.trim() !== term ) {
					return;
				}
				panel.classList.remove( 'is-loading' );
				render( products, term );
			} )
			.catch( function ( err ) {
				if ( err && err.name === 'AbortError' ) {
					return;
				}
				panel.classList.remove( 'is-loading' );
				clearResults();
				status.textContent = 'No pudimos buscar ahora. Apretá Enter para ver los resultados.';
			} );
	}

	toggle.addEventListener( 'click', function () {
		if ( isOpen() ) {
			close( false );
		} else {
			open();
		}
	} );

	closeBtn.addEventListener( 'click', function () {
		close( true );
	} );

	input.addEventListener( 'input', function () {
		var term = input.value.trim();
		clearTimeout( timer );
		if ( term.length < MIN_CHARS ) {
			if ( controller ) {
				controller.abort();
			}
			panel.classList.remove( 'is-loading' );
			clearResults();
			status.textContent = '';
			return;
		}
		timer = setTimeout( function () {
			search( term );
		}, DEBOUNCE_MS );
	} );

	input.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'ArrowDown' || e.key === 'ArrowUp' ) {
			if ( list.hidden ) {
				return;
			}
			e.preventDefault();
			setActive( activeIndex + ( e.key === 'ArrowDown' ? 1 : -1 ) );
		} else if ( e.key === 'Enter' && activeIndex >= 0 ) {
			e.preventDefault();
			window.location.href = options()[ activeIndex ].firstChild.href;
		}
	} );

	form.addEventListener( 'submit', function ( e ) {
		if ( input.value.trim().length === 0 ) {
			e.preventDefault();
		}
	} );

	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && isOpen() ) {
			close( true );
		}
	} );

	// Click fuera del panel (y fuera de la lupa) lo cierra.
	document.addEventListener( 'click', function ( e ) {
		if ( isOpen() && ! panel.contains( e.target ) && ! toggle.contains( e.target ) ) {
			close( false );
		}
	} );

	// En la página de resultados, el campo arranca con lo que se buscó.
	var current = new URLSearchParams( window.location.search ).get( 's' );
	if ( current ) {
		input.value = current;
	}
} )();
