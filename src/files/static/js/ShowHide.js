/**
 * ShowHide.js - version 1.0.1
 *
 * This module can be used to let the user toggle additional information in a
 * container.
 */

/* global module */
(function(root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD
		define([], factory);
	} else if (typeof exports === 'object') {
		// Common.js
		module.exports = factory();
	} else {
		root.ShowHide = factory();
	}
}(this, function() {
	'use strict';

	// 1: The flag to indicate if the init method has been executed
	// 2: The object with the configuration for the module
	var initialized = false,                /* [1] */
	    options,                            /* [2] */
	    NO_TRANSITIONS = 'no-transitions';

	/**
	 * Iterates over the keys of an object and calls a callback function when the
	 * key belongs to he object itself and not to its prototype.
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

	/**
	 * This method tries to determine the name of the transitionend event, it
	 * could be the user's browser is using a prefixed version
	 */
	function transitionEndEventName() {
		// 1: The variable we use to keep track of the current key when
		//    iterating over the transitions object
		// 2: An element we can use to test if a CSS property if known to the
		//    browser
		// 3: The key:value pairs represent CSS-property:Event-name values. By
		//    testing if the browser supports a CSS property we can tell what
		//    name to use for the transitionend event
		var key,                                        /* [1] */
		    el = document.createElement('div'),            /* [2] */
		    transitions = {                                /* [3] */
			    WebkitTransition : 'webkitTransitionEnd',
			    OTransition      : 'otransitionend',  // oTransitionEnd in very old Opera
			    MozTransition    : 'transitionend',
			    transition       : 'transitionend'
			};

		// Loop over the keys in the transition object
		for (key in transitions) {
			// Check the key is a property of the object and check if the CSS
			// property does not return undefined. If the result is undefined it
			// means the browser doesn't recognize the (un)prefixed property
			if (transitions.hasOwnProperty(key) && el.style[key] !== undefined) {
				// The CSS property exists, this means we know which name of the
				// transitionend event we can use for this browser
				return transitions[key];
			}
		}

		// If the method reaches this line it means that none of the CSS
		// properties were recognized by the browser. It is safe to conclude
		// there is no support for transitions (or at least none that we can use
		// in any meaningful way)
		return NO_TRANSITIONS;
	}

	var exports = function(overrides) {
		options = mergeOptions(overrides);
		// Try to determine the name of the transitionEnd event, it might be
		// prefixed
		options.transitionEnd = transitionEndEventName();
	};

	// These are the default configuration settings for the module, these can be
	// overriden by calling the module constructor with an object that has the
	// new value for the property
	exports.options = {
		attrContent    : 'data-sh-content',
		attrContainer  : 'data-sh-container',
		attrOpenOnInit : 'data-sh-open',
		attrTrigger    : 'data-sh-trigger',
		cssClosed      : 'closed',
		cssOpened      : 'opened',
		cssTransition  : 'transition'
	};

	function _closeItem(id, skipTransition) {
		var container = document.querySelector('[' + options.attrContainer + '="' + id + '"]'),
		    trigger = document.querySelector('[' + options.attrTrigger + '="' + id + '"]'),
		    applyTransition = !skipTransition && options.transitionEnd !== NO_TRANSITIONS;

		if (container == null || trigger == null) {
			return;
		}

		container.classList.remove(options.cssOpened);
		container.classList.add(options.cssClosed);

		if (trigger.hasAttribute('data-sh-text-closed')) {
			var text = document.createTextNode(trigger.getAttribute('data-sh-text-closed'));
			trigger.textContent = text.textContent;
		}

		// Remove the transition class as the first style change we do should not be animated
		container.classList.remove(options.cssTransition);
		// Check of the module has been intialized, if it is not we want to forgo the close animation all together
		if (initialized && applyTransition) {
			// Add an eventlistner to detect when the transition of the container has ended
			container.addEventListener(options.transitionEnd, _onTransitionEndHandlerContainer);
			// Set the max height to the actual height of the filter item (it is set to 9999px at this point). If we
			// don't do this first the transition will to from 9999px to 32px and will be visible as the difference is
			// too large
			container.style.maxHeight = container.offsetHeight + 'px';
			// This is not my own idea, I got this from http://jsfiddle.net/adambiggs/MAbD3/. Apparently it is
			// needed to disable/enable the transition. Anyway, we will wait for 10ms before we set the next set
			// of css properties
			setTimeout(function() {
				// The next style change should be animated, apply the transition class on the filter item
				container.classList.add(options.cssTransition);
				// The item should be just high enough to show the title
				container.style.maxHeight = _getCollapsedHeight(container) + 'px';
			}, 10);
		} else {
			// The item should be just high enough to show the title. This change should be instantaneous as we're
			// initializing the module
			container.style.maxHeight = _getCollapsedHeight(container) + 'px';
			setTimeout(function() {
				// Once the filter item has been given its initial height we need to add the transition class so the
				// opening of the filter item will be animated
				if (options.transitionEnd === NO_TRANSITIONS) {
					_makeContainerSane(container);
				} else {
					container.classList.add(options.cssTransition);
				}
			}, 10);
		}
	}

	function _getCollapsedHeight(container) {
		var trigger = container.querySelector('[' + options.attrTrigger + ']'),
		    result = 0,
		    styles;

		styles = window.getComputedStyle(container);

		if (trigger != null) {
			// We know the trigger is somewhere within in the container, we will
			// traverse its parents untill we get the element that is a direct
			// child of the container
			while (trigger.parentNode !== container) {
				trigger = trigger.parentNode;
			}
			styles = window.getComputedStyle(trigger);
			// If the position of the trigger is absolute it is taken out of the
			// flow and thus should be counted towards the height of the
			// container when the detail view is collapsed
			if (styles.position !== 'absolute') {
				result += trigger.offsetHeight;
				result += parseInt(styles['margin-bottom'], 10) + parseInt(styles['margin-top'], 10);
			}
		}

		styles = window.getComputedStyle(container);
		if (styles['box-sizing'] === 'border-box') {
			result += parseInt(styles['border-bottom-width'], 10) + parseInt(styles['border-top-width'], 10);
		}

		return result;
	}

	function _onClickHandlerTrigger(event) {
		var trigger = event.target,
		    itemId = trigger.getAttribute(options.attrTrigger),
		    container = document.querySelector('[' + options.attrContainer + '="' + itemId + '"]');

		if (container == null) {
			return;
		}

		if (container.classList.contains(options.cssClosed)) {
			_openItem(itemId);
		} else {
			_closeItem(itemId);
		}
	}

	/**
	* Handles the transition end event, this is where we need to do some finishing up
	* for the opening/closing of the container.
	*
	* @param  {Event} event The event as fired
	*/
	function _onTransitionEndHandlerContainer(event) {
		// Get an easy reference to the filter item which has been opened or closed
		var container = event.currentTarget;

		// Remove the event listener from the container, the transition has ended
		container.removeEventListener(options.transitionEnd, _onTransitionEndHandlerContainer);
		_makeContainerSane(container);
	}

	function _openItem(id, skipTransition) {
		// 1: Inside the method we want to know if the animation should be applied, to make the
		//    code more readable we will make
		var container = document.querySelector('[' + options.attrContainer + '="' + id + '"]'),
			content = container.querySelector('[' + options.attrContent + ']'),
			trigger = document.querySelector('[' + options.attrTrigger + '="' + id + '"]'),
			applyTransition = (!skipTransition && options.transitionEnd !== NO_TRANSITIONS);            /* [1] */

		// Check if we have all the elements we need to show the detail view
		if (container == null || content == null || trigger == null) {
			return;
		}
		skipTransition = (skipTransition === undefined) ? false : skipTransition;
		// Remove the closed class and add the opened class to the container
		container.classList.remove(options.cssClosed);
		container.classList.add(options.cssOpened);

		// Check if the trigger has a text for when the detail view is open
		if (trigger.hasAttribute('data-sh-text-opened')) {
			// Replace the trigger text for the text when the detail view is open
			var text = document.createTextNode(trigger.getAttribute('data-sh-text-opened'));
			trigger.textContent = text.textContent;
		}

		// We need to set the max height for the filter item. We do this by taking the height of the
		// div which contains all the content of the filter item plus the height of the element
		// with the class block-header as this element is outside of the div. In the _onTransitionEnd
		// method we will remove the max height to make sure the filter item can grow taller if needed
		container.classList.remove(options.cssTransition);
		// Make the content visible again by setting its display to block
		content.style.display = 'block';

		// Set the initial max-height, if this is not set the transition will not trigger when we set
		// the max height to include the detail view
		container.style.maxHeight = _getCollapsedHeight(container) + 'px';
		setTimeout(function() {
			// Check if the transition should be applied; when it should be animated we need to
			// add the transition class on the the container
			if (applyTransition) {
				// Add an eventlistner to detect when the transition of the container has ended
				container.addEventListener(options.transitionEnd, _onTransitionEndHandlerContainer);
				container.classList.add(options.cssTransition);
			}

			// Adjust the height
			container.style.maxHeight = (content.offsetHeight + _getCollapsedHeight(container)) + 'px';

			// Check if the transition was not applied to the opening of the container, in this case we need
			// to manually call the method to make the container sane again
			if (!applyTransition) {
				_makeContainerSane(container);
			}
		}, 10);
	}

	function _makeContainerSane(container) {
		if (container == null) {
			return;
		}

		if (container.classList.contains(options.cssClosed)) {
			// The container should contain only a single content element, we need this element
			var content = container.querySelector('[' + options.attrContent + ']');
			if (content != null) {
				// The filter item is closed, we will make the container invisible
				content.style.display = 'none';
			}
		}

		if (container.classList.contains(options.cssTransition)) {
			container.classList.remove(options.cssTransition);
			// There was a bug on OSX Safari which would show some odd behaviour
			// when opening the container. The source was the removal of the
			// max-height style. OSX Safari would transition this removal. The
			// way to solve this problem is by removing the transition class
			// before removing the max-height style. But in order for this to
			// take effect we need to apply 10ms timeouts in between
			// manipulating the styles. Ugly but functional.
			setTimeout(function() {
				// Remove the max-height value so the container can grow as big as it needs to to
				// accommodate all its content;
				container.style.removeProperty('max-height');
				setTimeout(function() {
					container.classList.add(options.cssTransition);
				}, 10);
			}, 10);
		} else {
			// Remove the max-height value so the container can grow as big as it needs to to
			// accommodate all its content;
			container.style.removeProperty('max-height');
		}
	}

	exports.prototype = {
		/**
		 * Makes the detail view hidden.
		 *
		 * @param {string} id                      The ID of the Show/Hide content.
		 * @param {boolean} [skipTransition=false] True to skip the open animation; pass
		 *                                         false to play the animation.
		 */
		hideDetailView: function(id, skipTransition) {
			// Try to get the container with the provided ID
			var container = document.querySelector('[' + options.attrContainer + '="' + id + '"]');

			// Make sure we found the container and it is not yet open
			if (container == null || container.classList.contains(options.cssClosed)) {
				// Either the container was not found or it already contains the
				// class opened; either way we stop
				return;
			}

			// Close the detail view
			_closeItem(id, skipTransition);
		},

		/**
		 * This method will initialize the module. It will look for all elements
		 * with the attribute [data-sh-trigger] and initialize their toggle
		 * state.
		 *
		 * It is possible to specify a callback method to be called after each
		 * toggle has been intialised.
		 *
		 * @param {Function} onInitCallback The method to be called when a toggle
		 *                                  has been initialised. This will not get
		 *                                  called when there was no matching container
		 *                                  for the trigger element. The callback will
		 *                                  receive an object with the property ID, its
		 *                                  value will be the same as the value of the
		 *                                  data-sh-trigger attribute.
		 * @param {Object} context          The context on which the callback should be
		 *                                  executed. It will be an empty object if no
		 *                                  context is provided.
		 */
		init: function(onInitCallback, context) {
			context = context || {};

			// Get all the triggers from the DOM
			var triggers = document.querySelectorAll('[' + options.attrTrigger + ']'),
			    index = 0,
			    ubound = triggers.length;

			// Iterate over the triggers
			for (; index < ubound; index++) {
				// Get the trigger at the current index and try to get its container
				var trigger = triggers[index],
				    triggerId = trigger.getAttribute(options.attrTrigger),
				    container = document.querySelector('[' + options.attrContainer + '="' + triggerId + '"]');

				// Make sure the container for the trigger has been found, if it could not
				// be found skip this trigger and continue with the next one
				if (container == null) {
					continue;
				}

				// Add a click handler for the trigger, this will allow the item to be opened
				// and closed
				trigger.addEventListener('click', _onClickHandlerTrigger);
				// Check if the item should be opened by default
				if (container.getAttribute(options.attrOpenOnInit) === '1') {
					// Remove the attribute, it no longer serves a purpose
					container.removeAttribute(options.attrOpenOnInit);
					_openItem(triggerId, true);
				} else {
					_closeItem(triggerId, true);
				}

				if (onInitCallback != null) {
					onInitCallback.call(context, { id: triggerId });
				}
			}

			// Set the flag to indicate the module has been intialized
			initialized = true;

			// Remove the no-read-more class from the HTML element, this can be
			// used for styling purposes when there is a fallback scenario
			// implemented for when there is no JS available
			document.documentElement.classList.remove('no-read-more');
		},

		/**
		 * Replaces the trigger element with a new element. It removes the
		 * original trigger element from the DOM, removes its click handler, and
		 * inserts the new element at the position of the original trigger. Once
		 * the new element has been inserted a click handler will be attached to
		 * it so it will toggle the detail view.
		 */
		replaceTrigger: function(id, newElement) {
			// Make sure the new  element is actually something and that it has
			// the data attribute that makes it a trigger.
			if (newElement == null || !newElement.hasAttribute(options.attrTrigger)) {
				return;
			}

			// Try to get the original trigger and make sure we found it before
			// we continue
			var trigger = document.querySelector('[' + options.attrTrigger + '="' + id + '"]');
			if (trigger == null || newElement == null) {
				return;
			}

			// Remove the click handler from the original trigger and attach it
			// to the new trigger
			trigger.removeEventListener('click', _onClickHandlerTrigger);
			newElement.addEventListener('click', _onClickHandlerTrigger);
			// Replace the old trigger element with the new element
			trigger.parentNode.replaceChild(newElement, trigger);
			// Trash the old trigger
			trigger = null;
		},

		/**
		 * Makes the detail view visible.
		 *
		 * @param {string} id                      The ID of the Show/Hide content.
		 * @param {boolean} [skipTransition=false] True to skip the open animation; pass
		 *                                         false to play the animation.
		 */
		showDetailView: function(id, skipTransition) {
			// Try to get the container with the provided ID
			var container = document.querySelector('[' + options.attrContainer + '="' + id + '"]');

			// Make sure we found the container and it is not yet open
			if (container == null || container.classList.contains(options.cssOpened)) {
				// Either the container was not found or it already contains the
				// class opened; either way we stop
				return;
			}

			// Open the detail view
			_openItem(id, skipTransition);
		}
	};

	return exports;
}));
