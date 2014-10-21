/**
 * ScrollTo.js - version 1.0.0
 *
 * A class for animating the jump from an anchor to its target within the same
 * document. It also has support for a scroll to top element which can be
 * hidden/made visible based on the scroll position of the document.
 */
(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.ScrollTo = factory();
	}
}(this, function() {
	'use strict';

	var scrollToTopButton,
	    _distance,
	    _iteration,
	    _options,
	    _startPosition;

	/**
	 * Iterates over the keys of an object and calls a callback function when the
	 * key belongs to the object itself and not to its prototype.
	 */
	function iterate(object, callback) {
		for (var key in object) {
			if (object.hasOwnProperty(key)) {
				callback(key, object[key]);
			}
		}
	}

	/**
	 * Helper method to merge the default options with the overrides passed
	 * along to the constructor.
	 *
	 * @param {object} overrides The overrides for the default options. These
	 *                           values will take precedence over the default
	 *                           values.
	 *
	 * @returns {object} The method returns an object containing the default
	 *                   options with the values override by those of the
	 *                   overrides object.
	 */
	function mergeOptions(overrides) {
		var result = {};

		// Copy the default options to the result object
		iterate(exports.options, function(key, value) {
			result[key] = value;
		});

		// Iterate over the keys in the overrides object
		iterate(overrides, function(key, value) {
			// Check if the key for an existing configuration property
			if (result[key] !== undefined) {
				// Override the default value
				result[key] = value;
			}
		});

		// Return the merge result
		return result;
	}

	var exports = function(overrides) {
		_options = mergeOptions(overrides);
	};

	// 1: The name of the data attribute which is used to indicate the anchor
	//    should not animate the jump to its target
	// 2: The CSS class to apply to the scroll to top button when it is not
	//    available to the visitor
	// 3: The number of iterations to use to scroll from the current y position
	//    to the desired y position
	// 4: The query to use with document.querySelector to find the element which
	//    the visitor can use to scroll back to the top of the document
	// 5: When an element is provided for the scroll to top functionality the
	//    clientHeight will be divided by this number. Only when the current
	//    scroll position exceeds the result of the division will the scroll top
	//    top element be made available. Eg: with a value of 3 the scroll to top
	//    element will become visible when a third of the clientHeight has been
	//    scrolled.
	exports.options = {
		attrIgnoreAnchor     : 'data-scrolltop-ignore',		/* [1] */
		correction           : 0,
		cssScrollTopDisabled : 'not-available',				/* [2] */
		maxIterations        : 50,							/* [3] */
		queryScrollTop       : '.scroll-to-top',			/* [4] */
		topThresholdRatio    : 3							/* [5] */
	};

	// Because of the numerous names of requestAnimationFrame we use this var to
	// point to the version that is available to us. When the browser doesn't
	// have one of the known requestAnimationFrame methods we will role our own
	// fallback method with a setTimeout.
	var requestAnimationFrame = window.requestAnimationFrame ||
	                            window.mozRequestAnimationFrame ||
	                            window.webkitRequestAnimationFrame ||
	                            function(callback) {
		                            window.setTimeout(callback, 1000 / 60);
	                            };

	/*
	* This method is used to scroll a bit closer to the top of the window. As long as the top
	* hasn't been reached the method will call itself at the next animation frame.
	*/
	function _animationLoop() {
		// Perform a step of the animation to go to the top of the window
		window.scrollTo(0, _easeOutCubic(_iteration, _startPosition, _distance, _options.maxIterations));
		// Increase the iteration counter
		_iteration++;

		// As long as we haven't gone through the max number of iterations we will have to schedule
		// the next part of the animation
		if (_iteration <= _options.maxIterations) {
			// We're not there yet, request a new animation frame to move a little closer to the top
			requestAnimationFrame(function() {
				_animationLoop();
			});
		}
	}

	/**
	 * Loops the body and finds all hrefs that contain an anchor and adds a
	 * javascript function to provide animated scroll
	 */
	function _attachClickHandlers() {
		var items = document.querySelectorAll('a[href^="#"]'),
		    index = 0,
		    ubound = items.length,
		    item;

		// Loop over all the anchors that link to an ID in the document
		for (; index < ubound; index++) {
			// Get the current item for easy reference
			item = items[index];
			// Check if the item does not have the ignore attribute; if it does
			// we need to skip this anchor, otherwise we need to attach a click
			// handler
			if (!item.hasAttribute(_options.attrIgnoreAnchor)) {
				// Anchor should not be ignored, attach a click handler
				item.addEventListener('click', _onClickHandler);
			}
		}
	}

	/*
	 * Robert Penner's algorithm for an cubic ease out function
	 * @param  {Number} currentIteration The current iteration of the animation,
	 *                                   on each subsequent  call this should be
	 *                                   increased by 1
	 * @param  {Number} startValue       The start value, this should be a
	 *                                   constant throughout the animation.
	 * @param  {Number} changeInValue    The difference between the start value
	 *                                   and the desired end value
	 * @param  {Number} totalIterations  The number of iterations over which we
	 *                                   want to go from start to end
	 * @return {Number}                  The value for the current step in the
	 *                                   animation
	 */
	function _easeOutCubic(currentIteration, startValue, changeInValue, totalIterations) {
		return changeInValue * (Math.pow(currentIteration / totalIterations - 1, 3) + 1) + startValue;
	}

	/**
	 * Returns the height of the document in a cross browser safe way
	 * @return {Number} The height of the document in pixels
	 */
	function _getDocumentHeight() {
		// There are quite a few variables that can return the height of the
		// current document. This method attempts to cover all the bases for a
		// reliable end result
		var scrollHeight = (document.documentElement || document.body).scrollHeight,
			offsetHeight = (document.documentElement || document.body).offsetHeight,
			clientHeight = (document.documentElement || document.body).clientHeight;
		// Return whichever value is the highest
		return Math.max(scrollHeight, offsetHeight, clientHeight);
	}

	/**
	 * Returns the height of the viewport in a cross browser safe way
	 * @return {Number} The height of the viewport in pixels.
	 */
	function _getViewportHeight() {
		return document.body.clientHeight;
	}

	/*
	 * Returns the scroll position of the document in a cross browser safe way.
	 *
	 * @return {Number} The current y position of the document.
	 */
	function _getScrollPosition() {
		if (window.pageYOffset !== undefined) {
			return window.pageYOffset;
		} else {
			return (document.documentElement || document.body.parentNode || document.body).scrollTop;
		}
	}

	function _onClickHandler(event) {
		// Get the target, this is the link the user has clicked on
		var target = (event.currentTarget) ? event.currentTarget : event.srcElement;
		if (target == null) {
			return;
		}

		// Get the element the link referes to and make sure the link target
		// exists before we continue
		var hrefTarget = document.querySelector(target.getAttribute('href'));
		if (hrefTarget == null) {
			return;
		}

		var correction = 0;
		if (!target.hasAttribute('data-no-correction')) {
			correction = _options.correction;
		}
		// Start the animation, as a starting point we will use the current
		// position. We want to animate the document to the position of the
		// element which is the target of the anchor, we can get the distance
		// between the current position and the top of the target element by
		// getting its bounding client rect and using its top property. This
		// will be a positive value, the number of pixels we have to scroll down
		// to get to the target element.
		setTimeout(function() {
			_startAnimation(_getScrollPosition(), hrefTarget.getBoundingClientRect().top + correction);
		}, 10);
		// Prevent the default behaviour of the anchor element, otherwise IE8
		// will perform a nasty jump to the target only to perform the scroll
		// animation after that.
		event.preventDefault();
	}

	/*
	 * Handles the scroll event of the window, this is were we decide whether
	 * the scroll to top button should be visible.
	 */
	function _scrollEventHandler(event) {
		// Check if we have a button (we should not be here otherwise but better
		// safe than sorry)
		if (scrollToTopButton) {
			// Get the viewport size
			var clientHeight = document.body.clientHeight;
			// Check if the user scrolled more than a third of the height of the
			// viewport
			if (_getScrollPosition() > clientHeight / _options.topThresholdRatio) {
				// The user scrolled more than the height of the viewport, we
				// will make the scroll to top button available
				scrollToTopButton.classList.remove(_options.cssScrollTopDisabled);
			} else {
				// The scroll position of the document is less than the height
				// of the viewport, we will hide the scroll to top button
				scrollToTopButton.classList.add(_options.cssScrollTopDisabled);
			}
		}
	}

	/*
	 * This method will start the animation. Before staring the animation it
	 * will check if it is possible to travel the requested distance. If the
	 * distance is too big it will correct the distance to the nearest possible
	 * distance.
	 *
	 * @param  {Number} startPosition The position from which we should start
	 * @param  {Number} distance      The number of pixels to move the document.
	 *                                A negative number will move the document
	 *                                closer to the top; a positive number will
	 *                                scroll further down
	 */
	function _startAnimation(startPosition, distance) {
		// 1: The max position to scroll to is calculated by taking the height
		//    of the document and substracting the height of the viewport. The
		//    result is the y position that is in view at the top of the screen
		//    when the user has scrolled all the way to the bottom of the
		//    document
		// 2: The end position is the sum of the start position plus the
		//    distance
		var maxYPos = _getDocumentHeight() - _getViewportHeight(),	/* [1] */
		    endPosition = startPosition + distance;					/* [2] */

		// If the sum of the start position plus the distance is bigger than the
		// maxYPos we've calculated than we need to correct the distance as it
		// is not possible to scroll beyond the y position of maxYPos
		if (endPosition > maxYPos) {
			// The distance is less than we though, we need to get the
			// difference between the maxYPos and the current position of the
			// document
			distance = maxYPos - startPosition;
		} else if (endPosition < 0) {
			// We can't scroll beyond the top of the document, at the most we
			// can scroll to the top of document
			distance = -startPosition;
		}

		// Remember the information passed along
		_startPosition = startPosition;
		_distance = distance;
		// Reset the iteration count
		_iteration = 0;
		// Start the scroll animation
		_animationLoop();
	}

	exports.prototype = {
		init: function() {
			// Did the implementer create a scroll to top button
			scrollToTopButton = document.querySelector(_options.queryScrollTop);
			// Only activate scroll tot top button if we have one
			if (scrollToTopButton) {
				window.addEventListener('scroll', _scrollEventHandler);
			}
			// Find all anchored links and attach a clickhandler
			_attachClickHandlers();
		},

		scrollToElement: function(element) {
			_startAnimation(_getScrollPosition(), element.getBoundingClientRect().top);
		}
	};

	return exports;
}));
