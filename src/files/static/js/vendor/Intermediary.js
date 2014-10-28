/* global module */
(function(root, factory) {
	'use strict';

	/* istanbul ignore next */
	if (typeof define === 'function' && define.amd) {
		// AMD
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.Intermediary = factory();
	}
}(this, function() {
	'use strict';

	/**
	* This removes all subscribers from all channels and removes the channels.
	*/
	function cleanUp(channel) {
		// Iterate over all the child channels of the current channel
		for(var key in channel._channels) {
			// Make sure the current key is a channel
			/* istanbul ignore else */
			if (channel._channels.hasOwnProperty(key)) {
				//console.log('Cleaning up ' + channel._channels[key].namespace);
				// Call cleanup again but this time for the current sub-channel
				cleanUp(channel._channels[key]);
				// Once the cleanup of the sub-channels has been done we can remove
				// the sub-channel from the list of sub-channels
				delete channel._channels[key];
			}
		}
		// We're done processing the sub-channels now it is time to remove all the subscribers
		// from the current channel
		channel.removeSubscriber();
	}

	/**
	* This method iterates over the hierarchy of the channel, creating the channels that aren't there
	* yet, and returns the channel for the full hierachy path.
	*
	* @param {String}  namespace The namespace of the channel. This should be in form form of root:sub1:sub2:sub3
	* @param {Boolean} readOnly  When true the method will not create subchannels that do not already exists. When
	*                            this is false the method will create all non-existing channels in the namespace.
	*
	* @returns {Object} It returns an instance of the Channel object for the last channel in the hierarchy. If the
	*                   readOnly param was true and a subchannel in the namespace could not be found the result
	*                   is null.
	*/
	function getChannel(namespace, readOnly) {
		// Check if we've received a namespace, if not there is no need to continue
		if (namespace == null || namespace === '') {
			return null;
		}

		var channel = _channels,
			hierarchy = namespace.split(':');

		var index = 0,
			ubound = hierarchy.length;
		while (index<ubound && channel != null) {
			// Check if the current channel has the requested sub channel
			if (!channel.hasChannel(hierarchy[index])) {
				// The subchannel doesn't exist, check if we're in write mode
				if (readOnly) {
					// We're in read-only mode, the requested subchannel doesn't exist. There
					// is no need to keep checking the rest of the hierarchy. Instead we will
					// break the loop here, this will cause channel to be a reference to the
					// last channel in the hierarchy we were able to find
					break;
				} else {
					// We're in write mode, this means we can create a new subchannel
					// for the current channel and use the new subchannel to continue
					channel = channel.addChannel(hierarchy[index]);
				}
			} else {
				// The request subchannel exist, get it and use it for the next iteration
				channel = channel.returnChannel(hierarchy[index]);
			}
			// Don't forget to increase the index to go to the next subchannel in the namespace hierarchy
			index++;
		}

		// Return the most specific channel we were able to find. It it happens to be the root
		// channel with an empty namespace we will return null to indicate the channel doesn't
		// exist
		return (channel.namespace === '') ? null : channel;
	}

	/**
	 * Generates a random string which follows the pattern of a GUID.
	 */
	function guidGenerator() {
		var S4 = function() {
			/*jshint -W016 */
			return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
			/*jshint +W016 */
		};

		return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4());
	}

	/**
	 * Compares the priority property of two subscribers and returns whether
	 * subscriber A should be called before subscriber B or not. The result of
	 * the compare is a descending sort.
	 */
	function subscriberPriorityCompare(a, b) {
		if (a.options.priority > b.options.priority) {
			return -1;
		} else if (a.options.priority < b.options.priority) {
			return 1;
		}
		return 0;
	}






	/*------------------------------------------------------------------------*\
		Subscriber

		Instances of this object are created by instances of the Channel object.
		It contains information needed to identify and call the callback method
		of a subscriber to a channel.
	\*------------------------------------------------------------------------*/
	function Subscriber(callback, context, options) {
		this.id = guidGenerator();
		this.callback = callback;
		this.context = context;
		this.options = options;
		this.channel = null;
	}





	/*------------------------------------------------------------------------*\
		Channel

		A channel is a pipeline others can subscribe to. There is a hierarchy to
		channels, a channel has a parent channel and it in turn be a parent to
		other channels.

		Channels keep track of their subscribers and will test which subscribers
		need to be called when a message is posted to the channel.
	\*------------------------------------------------------------------------*/

	/**
	 * Constructor, creates a new instance of the Channel object.
	 *
	 * @param {string} namespace The namespace of the Channel, this should
	 *                           include the ID's of all the channel's ancestors
	 * @param {Channel} parent   A reference to an instance of Channel which
	 *                           serves as a parent to this channel
	 * @param {string} id        The ID by which the channel will be known, this
	 *                           must match the last part of the namespace
	 *
	 * @constructor
	 */
	function Channel(namespace, parent, id) {
		this.namespace = namespace || '';
		this.id = id;
		this._subscribers = [];
		this._channels = {};
		this._parent = parent;
		this._stopped = false;
	}

	Channel.prototype = {
		/**
		 * Adds a child channel to the current channel.
		 *
		 * @param {string} channel The name of the channel which should be added
		 *
		 * @returns {Channel} Returns the newly created instance of Channel.
		 */
		addChannel: function(channelName) {
			// If the current channel has a namespace we need to add a ':' to it and
			// append the name of the new channel. If the current channel doesn't
			// have a namespace we just use the channel name as the namespace.
			var namespace = ((this.namespace === '') ? '' : this.namespace + ':') + channelName;
			// Add the new channel to the list of child channels. The parent
			// of the new channel will be the current channel
			var newChannel = new Channel(namespace, this, channelName);
			this._channels[channelName] = newChannel;

			return newChannel;
		},

		/**
		 * Adds a new subscriber to the channel.
		 *
		 * @param {Function} callback The function to call when the channel determines
		 *                            the subscriber should be notified
		 * @param {Object} context    The context to use when calling the callback
		 * @param {?Object} options
		 */
		addSubscriber: function(callback, context, options) {
			/* istanbul ignore next */
			if (options == null) {
				options = {}
			}
			if (options.priority == null) {
				options.priority = 0;
			} else {
				options.priority = options.priority | 0;
			}
			// Create a new Subscriber instance to keep track of the subscriber info
			var subscriber = new Subscriber(callback, context, options);
			// Add for to which channel the subscriber subscribed
			subscriber.channel = this;
			// Add the subscriber to the array of subscribers
			this._subscribers.push(subscriber);

			this._subscribers.sort(subscriberPriorityCompare);

			// Return the subscriber
			return subscriber;
		},

		autoRemoveChannel: function() {
			// First make sure there are no more subscribers, if there are we
			// can stop processing the channel any further
			if (this._subscribers.length !== 0) {
				return;
			}

			// Next we need to make sure there are no more sub-channels that
			// have this channel as its root channel. We try to iterate over the
			// properties of _channels and as soon as we find a property we've
			// set we will stop processing the channel any further
			for (var key in this._channels) {
				/* istanbul ignore else */
				if (this._channels.hasOwnProperty(key)) {
					return;
				}
			}

			// The last check before we can remove the channel is to see if it
			// has a parent. If there is no parent we don't want to remove this
			// channel
			if (this._parent != null) {
				// The parent of the current channel to remove this channel
				this._parent.removeChannel(this.id);
			}
		},

		/**
		 * Returns whether or not the provided channel is a child of the current channel
		 *
		 * @returns {Boolean} Returns true if the channel is a child of the current channel; otherwise false.
		 */
		hasChannel: function(channel) {
			return this._channels.hasOwnProperty(channel);
		},

		publish: function(data) {
			var index = 0,
			    ubound = this._subscribers.length,
			    originalUbound = ubound;

			// Loop over all the channel subscribers
			while (index<ubound) {
				var shouldCall = false,
				    subscriber = this._subscribers[index],
				    options = subscriber.options;

				// Check if the subscriber has a predicate
				if (options != null && options.predicate != null) {
					// Apply the predicate, it should return true or false and this
					// will determine whether or not we will call the callback
					shouldCall = options.predicate.apply(subscriber.context, data);
				} else {
					// No predicate set for the subscriber, we will have to call
					// the callback method
					shouldCall = true;
				}

				if (shouldCall) {
					/* istanbul ignore else */
					if (options != null) {
						/* istanbul ignore else */
						if (options.calls != null) {
							options.calls--;
							/* istanbul ignore else */
							if (options.calls < 1) {
								this.removeSubscriber(subscriber.id);
							}
						}
					}
					subscriber.callback.apply(subscriber.context, data);

					// Check if a subscriber has been removed from the array
					if (this._subscribers.length != originalUbound) {
						// We need to correct the index for number of elements removed
						index = index - (originalUbound - this._subscribers.length);
						// Set the variables to the current length of the subscribers array
						originalUbound = ubound = this._subscribers.length;
					}
				}
				// Continue with the next subscriber of the channel
				index++;
			}

			// Check if the channel has a parent channel, if so we also need to
			// publish the data on that channel
			if (this._parent != null) {
				this._parent.publish(data);
			}
		},

		removeChannel: function(channel) {
			// Verify the channel is a sub-channel of the current channel
			/* istanbul ignore else */
			if (this.hasChannel(channel)) {
				// Reset the channel object and remove the property from the
				// _channels object
				this._channels[channel] = null;
				delete this._channels[channel];

				// Now that we've removed the channel we can check if this
				// channel should be removed automatically
				this.autoRemoveChannel();
			}
		},

		/**
		 * Removes the subscriber from the channel
		 *
		 * @param {String} id Specifies the ID of the subscriber to remove from the channel. If this param has
		 *                    the value null it will cause all subscribers to be removed from the channel.
		 *
		 * @returns {Boolean} The method returns true if the specified ID was found in the array of subscribers;
		 *                    otherwise the value false is returned.
		 */
		removeSubscriber: function(id) {
			var result = false,
			    index = 0,
			    ubound = 0;

			// If no ID is provided will remove all subscribers from the channel
			if (id == null) {
				// Iterate over all the subscribers and reset their channel property to null
				for(index=0, ubound=this._subscribers.length; index<ubound; index++) {
					this._subscribers[index].channel = null;
				}
				// Empty the array of subscribers for the channel
				this._subscribers = [];
				// Set the result flag to true to indicate we succesfuly removed the subscriber
				result = true;
			} else {
				// We will start at the last item of the array and work our way back to the first item
				index = this._subscribers.length - 1 ;
				// Iterate over all the subscribers for the channel backwards until we've found the
				// subscriber to remove or we've reached the head of the array
				while (index >= 0 && !result) {
					if (this._subscribers[index].id === id) {
						// Remove the channel reference from the subscriber
						this._subscribers[index].channel = null;
						// Set the result flag to true, we've found the requested id. This will cause the while
						// loop to stop processing the subscribers which is what we want as the ID is supposed
						// to be unique and shouldn't occur again
						result = true;
						// Remove the current index from the array, this will remove the subscriber
						this._subscribers.splice(index, 1);
					}
					// Decrease the index so we can go to the previous item in the array
					index--;
				}
			}

			// See if the channel is good to be removed automatically
			this.autoRemoveChannel();

			// Return the result flag, this will tell the caller whether or not the subscriber was removed
			return result;
		},

		/**
		 * Returns the Channel object for the channel with the provided name
		 *
		 * @param {String} channel The name of the channel which should be returned
		 *
		 * @returns {Object} This method returns the instance of Channel for the given channel name. If no
		 *                   channel with the provided name exists it will return null;
		 */
		returnChannel: function(channel) {
			return this._channels[channel];
		},

		/**
		 * Returns the request subscriber to the channel.
		 *
		 * @param {String} id The ID of the subscriber to return.
		 *
		 * @returns {Object} It returns a reference to the instance of Subscriber with the matching ID. If
		 *                   the provided ID couldn't be found in the array of subscribers the methods returns
		 *                   null.
		 */
		returnSubscriber: function(id) {
			var result,
				index = this._subscribers.length - 1;

			// Iterate backwards over the subscribers until we've processed the first item in the
			// array of result references an object
			while (index >= 0 && result == null) {
				// Check if the ID of the current subscriber matches the provided ID
				if (this._subscribers[index].id === id) {
					// Get the reference to the requested subscriber
					result = this._subscribers[index];
				}
				// Decrease the index, go the the previous item in the array
				index--;
			}

			// Return the result
			return result;
		},

		setSubscriberPriority: function(id, priority) {
			var subscriber = this.returnSubscriber(id);
			if (subscriber == null) {
				return false;
			}
			subscriber.options.priority = (priority | 0);
			this._subscribers.sort(subscriberPriorityCompare);

			return true;
		}
	};

	// This is the empty base channel, all root channels created through the Intermediary will
	// have this as their base channel. It is safe from removal by the autoChannelCleanup
	// as it is the only channel instance without a parent channel
	var _channels = new Channel('');





	/*------------------------------------------------------------------------*\
		Intermediary

		This is the Intermediary object, it is a singleton which can't be initiated.
	\*------------------------------------------------------------------------*/
	return {
		/**
		 * This returns the subscriber for the namespace and id. Do not use this to change
		 * the priority of the subscriber as it will have no effect. To change the
		 * priority for the subscriber use @see {@link setSubscriberPriority}.
		 *
		 * @param {string} namespace The namespace of the channel to which the subscriber
		 *                           is subscribed
		 * @param {string} id        The ID of the subscriber to get
		 *
		 * @returns {null|Object} The result is null if the namespace could not be resolved
		 *                        to an existing channel or of the channel doesn't have a
		 *                        subscriber with the supplied ID. Otherwise it returns the
		 *                        instance of Subscriber matching the ID.
		 */
		getSubscriber: function(namespace, id) {
			// Get the channel for the provided namespace, do this in readOnly mode so
			// we don't create channels due to a typo or something
			var channel = getChannel(namespace, true);
			// If the request namespace could not be resolved to a channel we need to stop processing the request
			if (channel == null || channel.namespace !== namespace) {
				return null;
			}
			// Return the result of returnSubscriber for the provided ID.
			return channel.returnSubscriber(id);
		},

		/**
		 * Convenience method for subscribe. It makes sure there is an options object and sets
		 * the calls property to 1. @see {@link subscribe} for further information.
		 */
		once: function(namespace, callback, context, options) {
			options = options || {};
			options.calls = 1;

			return this.subscribe(namespace, callback, context, options);
		},

		/**
		 * Publishes a message to the channel at the given namespace. When the namespace is
		 * resolved it will attempt to resolve it to the most specific channel. Example: when
		 * there is a subscriber to the channel 'root:sub1' and the supplied namespace is
		 * 'root:sub1:sub2', the message will be published to 'root:sub1' as this is the most
		 * specific channel the namespace could be resolved to.
		 *
		 * @param {string} namespace The namespace for the channel to publish the message to. The
		 *                           message will be published to all the subscribers in the
		 *                           namespace hierarchy.
		 */
		publish: function(namespace) {
			// Get the channel for the provided namespace, do this in readOnly mode so
			// we don't create channels due to a type or something
			var channel = getChannel(namespace, true);
			// If the request namespace could not be resolved to a channel we need to stop processing
			// the request. We don't check if the namespace is an exact match because if the namespace
			// was root:sub1 we still want to continue if the returned channel is root.
			if (channel == null) {
				return null;
			}

			// Get the arguments that were passed along to the method
			var args = Array.prototype.slice.call(arguments, 1);
			if (args.length === 0) {
				args.push(null);
			}
			// Push the channel in the array
			args.push(namespace);
			// Call the publish method of the channel to actually publish the event
			channel.publish(args);
			return true;
		},

		/**
		 * Removes all subscribers from all channels and removes the channels from
		 * the Intermediary.
		 */
		reset: function() {
			cleanUp(_channels);
		},

		/**
		 * Updates the priority of the subscriber. The higher the number, the higher
		 * the priority of the subscriber. Higher priority subscribers will be called
		 * before lower priority subscribers.
		 *
		 * @param {string} namespace The namespace of the channel to which the subscriber
		 *                           is subscribed
		 * @param {string} id        The ID of the subscriber whose priority should be updated
		 * @param {number} priority  The new priority for the subscriber
		 *
		 * @returns {Object|boolean} The result is null when the namespace could not be resolved
		 *                           to an actual channel. The method will return false if the
		 *                           channel has no subscriber with the supplied ID. The result
		 *                           will be true when the priority of the subscriber has been
		 *                           updated.
		 */
		setSubscriberPriority: function(namespace, id, priority) {
			// Get the channel for the provided namespace, do this in readOnly mode so
			// we don't create channels due to a type or something
			var channel = getChannel(namespace, true);
			if (channel == null || channel.namespace != namespace) {
				return null;
			}

			return channel.setSubscriberPriority(id, priority);
		},

		/**
		 * Adds a subscriber to the channel specified with namespace.
		 *
		 * @param {string} namespace             The hierarchy of the channel to subscribe to
		 * @param {Function} callback            The method that should be called when the channel determines the
		 *                                       subscriber needs to be notified
		 * @param {Object} [context]             The context on which the callback should be called when the subscriber
		 *                                       needs to be notified
		 * @param {Object} [options]             The options for the subscriber
		 * @param {number} [options.calls]       The maximum number of times the subscriber should be called before it
		 *                                       is automatically removed from the channel. When nothing is specified
		 *                                       the subscriber will stay until it is manually removed
		 * @param {number} [options.priority]    The subscriber's priority. The higher the number, the higher the
		 *                                       priority. When nothing is specified the priority is 0
		 * @param {Function} [options.predicate] If specified it should be a function which returns either true or false
		 *                                       and it should take a single parameter which is the data posted to the
		 *                                       channel. When the method returns true the subscriber will be called; when
		 *                                       the method returns false the subscriber won't be called. When the
		 *                                       predicate returns false and the subscriber has a max number of calls
		 *                                       set the number of calls will not get decreased
		 */
		subscribe: function(namespace, callback, context, options) {
			// Get the channel to subscribe to, this will create any channels in
			// the namespace that don't yet exist
			var channel = getChannel(namespace, false);
			if (channel == null || channel.namespace != namespace) {
				return null;
			}

			// Make sure context and options aren't null when we create a subscriber
			context = context || {};
			options = options || {};

			// Subscribe to the channel and return the ID of the subscriber
			return channel.addSubscriber(callback, context, options).id;
		},

		/**
		 * Removes the subscriber with the specified ID from the namespace.
		 *
		 * @param {String} namespace The namespace of the channel from which the subscriber
		 *                           should be removed
		 * @param {String} id        The ID of the subscriber which should be removed from
		 *                           the channel
		 *
		 * @returns {null|boolean} - null:  when the provided namespace could not be resolved
		 *                            to an existing channel
		 *                   - true:  the subscriber with the provided ID has been removed
		 *                            from the channel
		 *                   - false: the channel didn't have a subscriber with the
		 *                            specified ID
		 */
		unsubscribe: function(namespace, id) {
			// Get the channel for the provided namespace, do this in readOnly mode so
			// we don't create channels due to a type or something
			var channel = getChannel(namespace, true);
			// If the request namespace could not be resolved to a channel we need to stop processing the request
			if (channel == null || channel.namespace !== namespace) {
				return null;
			}
			// Remove the subscriber from the channel
			return channel.removeSubscriber(id);
		}
	};
}));
