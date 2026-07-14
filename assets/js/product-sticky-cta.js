( function () {
	'use strict';

	var sticky = document.querySelector( '[data-hf-sticky-cta]' );
	var ctaBlock = document.querySelector( '.hf-product-cta' );
	if ( ! sticky || ! ctaBlock ) return;

	var priceLabel = sticky.querySelector( '[data-hf-sticky-price]' );
	var addBtn = sticky.querySelector( '[data-hf-sticky-add]' );

	function syncPrice() {
		var priceEl = document.querySelector( '.hf-product-price .woocommerce-Price-amount' );
		if ( priceEl && priceLabel ) {
			priceLabel.textContent = priceEl.textContent.trim();
		}
	}
	syncPrice();

	if ( 'IntersectionObserver' in window ) {
		var observer = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( entry ) {
				sticky.classList.toggle( 'is-visible', ! entry.isIntersecting && entry.boundingClientRect.top < 0 );
			} );
		}, { threshold: 0 } );
		observer.observe( ctaBlock );
	}

	addBtn.addEventListener( 'click', function () {
		var realButton = ctaBlock.querySelector( 'button[type="submit"], .single_add_to_cart_button' );
		if ( realButton ) {
			realButton.click();
		}
		ctaBlock.scrollIntoView( { behavior: 'smooth', block: 'center' } );
	} );
} )();
