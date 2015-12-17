var Elm = Elm || { Native: {} };
Elm.Native.Basics = {};
Elm.Native.Basics.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Basics = localRuntime.Native.Basics || {};
	if (localRuntime.Native.Basics.values)
	{
		return localRuntime.Native.Basics.values;
	}

	var Utils = Elm.Native.Utils.make(localRuntime);

	function div(a, b)
	{
		return (a / b) | 0;
	}
	function rem(a, b)
	{
		return a % b;
	}
	function mod(a, b)
	{
		if (b === 0)
		{
			throw new Error('Cannot perform mod 0. Division by zero error.');
		}
		var r = a % b;
		var m = a === 0 ? 0 : (b > 0 ? (a >= 0 ? r : r + b) : -mod(-a, -b));

		return m === b ? 0 : m;
	}
	function logBase(base, n)
	{
		return Math.log(n) / Math.log(base);
	}
	function negate(n)
	{
		return -n;
	}
	function abs(n)
	{
		return n < 0 ? -n : n;
	}

	function min(a, b)
	{
		return Utils.cmp(a, b) < 0 ? a : b;
	}
	function max(a, b)
	{
		return Utils.cmp(a, b) > 0 ? a : b;
	}
	function clamp(lo, hi, n)
	{
		return Utils.cmp(n, lo) < 0 ? lo : Utils.cmp(n, hi) > 0 ? hi : n;
	}

	function xor(a, b)
	{
		return a !== b;
	}
	function not(b)
	{
		return !b;
	}
	function isInfinite(n)
	{
		return n === Infinity || n === -Infinity;
	}

	function truncate(n)
	{
		return n | 0;
	}

	function degrees(d)
	{
		return d * Math.PI / 180;
	}
	function turns(t)
	{
		return 2 * Math.PI * t;
	}
	function fromPolar(point)
	{
		var r = point._0;
		var t = point._1;
		return Utils.Tuple2(r * Math.cos(t), r * Math.sin(t));
	}
	function toPolar(point)
	{
		var x = point._0;
		var y = point._1;
		return Utils.Tuple2(Math.sqrt(x * x + y * y), Math.atan2(y, x));
	}

	return localRuntime.Native.Basics.values = {
		div: F2(div),
		rem: F2(rem),
		mod: F2(mod),

		pi: Math.PI,
		e: Math.E,
		cos: Math.cos,
		sin: Math.sin,
		tan: Math.tan,
		acos: Math.acos,
		asin: Math.asin,
		atan: Math.atan,
		atan2: F2(Math.atan2),

		degrees: degrees,
		turns: turns,
		fromPolar: fromPolar,
		toPolar: toPolar,

		sqrt: Math.sqrt,
		logBase: F2(logBase),
		negate: negate,
		abs: abs,
		min: F2(min),
		max: F2(max),
		clamp: F3(clamp),
		compare: Utils.compare,

		xor: F2(xor),
		not: not,

		truncate: truncate,
		ceiling: Math.ceil,
		floor: Math.floor,
		round: Math.round,
		toFloat: function(x) { return x; },
		isNaN: isNaN,
		isInfinite: isInfinite
	};
};

Elm.Native.Port = {};

Elm.Native.Port.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Port = localRuntime.Native.Port || {};
	if (localRuntime.Native.Port.values)
	{
		return localRuntime.Native.Port.values;
	}

	var NS;

	// INBOUND

	function inbound(name, type, converter)
	{
		if (!localRuntime.argsTracker[name])
		{
			throw new Error(
				'Port Error:\n' +
				'No argument was given for the port named \'' + name + '\' with type:\n\n' +
				'    ' + type.split('\n').join('\n        ') + '\n\n' +
				'You need to provide an initial value!\n\n' +
				'Find out more about ports here <http://elm-lang.org/learn/Ports.elm>'
			);
		}
		var arg = localRuntime.argsTracker[name];
		arg.used = true;

		return jsToElm(name, type, converter, arg.value);
	}


	function inboundSignal(name, type, converter)
	{
		var initialValue = inbound(name, type, converter);

		if (!NS)
		{
			NS = Elm.Native.Signal.make(localRuntime);
		}
		var signal = NS.input('inbound-port-' + name, initialValue);

		function send(jsValue)
		{
			var elmValue = jsToElm(name, type, converter, jsValue);
			setTimeout(function() {
				localRuntime.notify(signal.id, elmValue);
			}, 0);
		}

		localRuntime.ports[name] = { send: send };

		return signal;
	}


	function jsToElm(name, type, converter, value)
	{
		try
		{
			return converter(value);
		}
		catch(e)
		{
			throw new Error(
				'Port Error:\n' +
				'Regarding the port named \'' + name + '\' with type:\n\n' +
				'    ' + type.split('\n').join('\n        ') + '\n\n' +
				'You just sent the value:\n\n' +
				'    ' + JSON.stringify(value) + '\n\n' +
				'but it cannot be converted to the necessary type.\n' +
				e.message
			);
		}
	}


	// OUTBOUND

	function outbound(name, converter, elmValue)
	{
		localRuntime.ports[name] = converter(elmValue);
	}


	function outboundSignal(name, converter, signal)
	{
		var subscribers = [];

		function subscribe(handler)
		{
			subscribers.push(handler);
		}
		function unsubscribe(handler)
		{
			subscribers.pop(subscribers.indexOf(handler));
		}

		function notify(elmValue)
		{
			var jsValue = converter(elmValue);
			var len = subscribers.length;
			for (var i = 0; i < len; ++i)
			{
				subscribers[i](jsValue);
			}
		}

		if (!NS)
		{
			NS = Elm.Native.Signal.make(localRuntime);
		}
		NS.output('outbound-port-' + name, notify, signal);

		localRuntime.ports[name] = {
			subscribe: subscribe,
			unsubscribe: unsubscribe
		};

		return signal;
	}


	return localRuntime.Native.Port.values = {
		inbound: inbound,
		outbound: outbound,
		inboundSignal: inboundSignal,
		outboundSignal: outboundSignal
	};
};

if (!Elm.fullscreen) {
	(function() {
		'use strict';

		var Display = {
			FULLSCREEN: 0,
			COMPONENT: 1,
			NONE: 2
		};

		Elm.fullscreen = function(module, args)
		{
			var container = document.createElement('div');
			document.body.appendChild(container);
			return init(Display.FULLSCREEN, container, module, args || {});
		};

		Elm.embed = function(module, container, args)
		{
			var tag = container.tagName;
			if (tag !== 'DIV')
			{
				throw new Error('Elm.node must be given a DIV, not a ' + tag + '.');
			}
			return init(Display.COMPONENT, container, module, args || {});
		};

		Elm.worker = function(module, args)
		{
			return init(Display.NONE, {}, module, args || {});
		};

		function init(display, container, module, args, moduleToReplace)
		{
			// defining state needed for an instance of the Elm RTS
			var inputs = [];

			/* OFFSET
			 * Elm's time traveling debugger lets you pause time. This means
			 * "now" may be shifted a bit into the past. By wrapping Date.now()
			 * we can manage this.
			 */
			var timer = {
				programStart: Date.now(),
				now: function()
				{
					return Date.now();
				}
			};

			var updateInProgress = false;
			function notify(id, v)
			{
				if (updateInProgress)
				{
					throw new Error(
						'The notify function has been called synchronously!\n' +
						'This can lead to frames being dropped.\n' +
						'Definitely report this to <https://github.com/elm-lang/Elm/issues>\n');
				}
				updateInProgress = true;
				var timestep = timer.now();
				for (var i = inputs.length; i--; )
				{
					inputs[i].notify(timestep, id, v);
				}
				updateInProgress = false;
			}
			function setTimeout(func, delay)
			{
				return window.setTimeout(func, delay);
			}

			var listeners = [];
			function addListener(relevantInputs, domNode, eventName, func)
			{
				domNode.addEventListener(eventName, func);
				var listener = {
					relevantInputs: relevantInputs,
					domNode: domNode,
					eventName: eventName,
					func: func
				};
				listeners.push(listener);
			}

			var argsTracker = {};
			for (var name in args)
			{
				argsTracker[name] = {
					value: args[name],
					used: false
				};
			}

			// create the actual RTS. Any impure modules will attach themselves to this
			// object. This permits many Elm programs to be embedded per document.
			var elm = {
				notify: notify,
				setTimeout: setTimeout,
				node: container,
				addListener: addListener,
				inputs: inputs,
				timer: timer,
				argsTracker: argsTracker,
				ports: {},

				isFullscreen: function() { return display === Display.FULLSCREEN; },
				isEmbed: function() { return display === Display.COMPONENT; },
				isWorker: function() { return display === Display.NONE; }
			};

			function swap(newModule)
			{
				removeListeners(listeners);
				var div = document.createElement('div');
				var newElm = init(display, div, newModule, args, elm);
				inputs = [];

				return newElm;
			}

			function dispose()
			{
				removeListeners(listeners);
				inputs = [];
			}

			var Module = {};
			try
			{
				Module = module.make(elm);
				checkInputs(elm);
			}
			catch (error)
			{
				if (typeof container.appendChild === "function")
				{
					container.appendChild(errorNode(error.message));
				}
				else
				{
					console.error(error.message);
				}
				throw error;
			}

			if (display !== Display.NONE)
			{
				var graphicsNode = initGraphics(elm, Module);
			}

			var rootNode = { kids: inputs };
			trimDeadNodes(rootNode);
			inputs = rootNode.kids;
			filterListeners(inputs, listeners);

			addReceivers(elm.ports);

			if (typeof moduleToReplace !== 'undefined')
			{
				hotSwap(moduleToReplace, elm);

				// rerender scene if graphics are enabled.
				if (typeof graphicsNode !== 'undefined')
				{
					graphicsNode.notify(0, true, 0);
				}
			}

			return {
				swap: swap,
				ports: elm.ports,
				dispose: dispose
			};
		}

		function checkInputs(elm)
		{
			var argsTracker = elm.argsTracker;
			for (var name in argsTracker)
			{
				if (!argsTracker[name].used)
				{
					throw new Error(
						"Port Error:\nYou provided an argument named '" + name +
						"' but there is no corresponding port!\n\n" +
						"Maybe add a port '" + name + "' to your Elm module?\n" +
						"Maybe remove the '" + name + "' argument from your initialization code in JS?"
					);
				}
			}
		}

		function errorNode(message)
		{
			var code = document.createElement('code');

			var lines = message.split('\n');
			code.appendChild(document.createTextNode(lines[0]));
			code.appendChild(document.createElement('br'));
			code.appendChild(document.createElement('br'));
			for (var i = 1; i < lines.length; ++i)
			{
				code.appendChild(document.createTextNode('\u00A0 \u00A0 ' + lines[i].replace(/  /g, '\u00A0 ')));
				code.appendChild(document.createElement('br'));
			}
			code.appendChild(document.createElement('br'));
			code.appendChild(document.createTextNode('Open the developer console for more details.'));
			return code;
		}


		//// FILTER SIGNALS ////

		// TODO: move this code into the signal module and create a function
		// Signal.initializeGraph that actually instantiates everything.

		function filterListeners(inputs, listeners)
		{
			loop:
			for (var i = listeners.length; i--; )
			{
				var listener = listeners[i];
				for (var j = inputs.length; j--; )
				{
					if (listener.relevantInputs.indexOf(inputs[j].id) >= 0)
					{
						continue loop;
					}
				}
				listener.domNode.removeEventListener(listener.eventName, listener.func);
			}
		}

		function removeListeners(listeners)
		{
			for (var i = listeners.length; i--; )
			{
				var listener = listeners[i];
				listener.domNode.removeEventListener(listener.eventName, listener.func);
			}
		}

		// add receivers for built-in ports if they are defined
		function addReceivers(ports)
		{
			if ('title' in ports)
			{
				if (typeof ports.title === 'string')
				{
					document.title = ports.title;
				}
				else
				{
					ports.title.subscribe(function(v) { document.title = v; });
				}
			}
			if ('redirect' in ports)
			{
				ports.redirect.subscribe(function(v) {
					if (v.length > 0)
					{
						window.location = v;
					}
				});
			}
		}


		// returns a boolean representing whether the node is alive or not.
		function trimDeadNodes(node)
		{
			if (node.isOutput)
			{
				return true;
			}

			var liveKids = [];
			for (var i = node.kids.length; i--; )
			{
				var kid = node.kids[i];
				if (trimDeadNodes(kid))
				{
					liveKids.push(kid);
				}
			}
			node.kids = liveKids;

			return liveKids.length > 0;
		}


		////  RENDERING  ////

		function initGraphics(elm, Module)
		{
			if (!('main' in Module))
			{
				throw new Error("'main' is missing! What do I display?!");
			}

			var signalGraph = Module.main;

			// make sure the signal graph is actually a signal & extract the visual model
			if (!('notify' in signalGraph))
			{
				signalGraph = Elm.Signal.make(elm).constant(signalGraph);
			}
			var initialScene = signalGraph.value;

			// Figure out what the render functions should be
			var render;
			var update;
			if (initialScene.ctor === 'Element_elm_builtin')
			{
				var Element = Elm.Native.Graphics.Element.make(elm);
				render = Element.render;
				update = Element.updateAndReplace;
			}
			else
			{
				var VirtualDom = Elm.Native.VirtualDom.make(elm);
				render = VirtualDom.render;
				update = VirtualDom.updateAndReplace;
			}

			// Add the initialScene to the DOM
			var container = elm.node;
			var node = render(initialScene);
			while (container.firstChild)
			{
				container.removeChild(container.firstChild);
			}
			container.appendChild(node);

			var _requestAnimationFrame =
				typeof requestAnimationFrame !== 'undefined'
					? requestAnimationFrame
					: function(cb) { setTimeout(cb, 1000 / 60); }
					;

			// domUpdate is called whenever the main Signal changes.
			//
			// domUpdate and drawCallback implement a small state machine in order
			// to schedule only 1 draw per animation frame. This enforces that
			// once draw has been called, it will not be called again until the
			// next frame.
			//
			// drawCallback is scheduled whenever
			// 1. The state transitions from PENDING_REQUEST to EXTRA_REQUEST, or
			// 2. The state transitions from NO_REQUEST to PENDING_REQUEST
			//
			// Invariants:
			// 1. In the NO_REQUEST state, there is never a scheduled drawCallback.
			// 2. In the PENDING_REQUEST and EXTRA_REQUEST states, there is always exactly 1
			//    scheduled drawCallback.
			var NO_REQUEST = 0;
			var PENDING_REQUEST = 1;
			var EXTRA_REQUEST = 2;
			var state = NO_REQUEST;
			var savedScene = initialScene;
			var scheduledScene = initialScene;

			function domUpdate(newScene)
			{
				scheduledScene = newScene;

				switch (state)
				{
					case NO_REQUEST:
						_requestAnimationFrame(drawCallback);
						state = PENDING_REQUEST;
						return;
					case PENDING_REQUEST:
						state = PENDING_REQUEST;
						return;
					case EXTRA_REQUEST:
						state = PENDING_REQUEST;
						return;
				}
			}

			function drawCallback()
			{
				switch (state)
				{
					case NO_REQUEST:
						// This state should not be possible. How can there be no
						// request, yet somehow we are actively fulfilling a
						// request?
						throw new Error(
							'Unexpected draw callback.\n' +
							'Please report this to <https://github.com/elm-lang/core/issues>.'
						);

					case PENDING_REQUEST:
						// At this point, we do not *know* that another frame is
						// needed, but we make an extra request to rAF just in
						// case. It's possible to drop a frame if rAF is called
						// too late, so we just do it preemptively.
						_requestAnimationFrame(drawCallback);
						state = EXTRA_REQUEST;

						// There's also stuff we definitely need to draw.
						draw();
						return;

					case EXTRA_REQUEST:
						// Turns out the extra request was not needed, so we will
						// stop calling rAF. No reason to call it all the time if
						// no one needs it.
						state = NO_REQUEST;
						return;
				}
			}

			function draw()
			{
				update(elm.node.firstChild, savedScene, scheduledScene);
				if (elm.Native.Window)
				{
					elm.Native.Window.values.resizeIfNeeded();
				}
				savedScene = scheduledScene;
			}

			var renderer = Elm.Native.Signal.make(elm).output('main', domUpdate, signalGraph);

			// must check for resize after 'renderer' is created so
			// that changes show up.
			if (elm.Native.Window)
			{
				elm.Native.Window.values.resizeIfNeeded();
			}

			return renderer;
		}

		//// HOT SWAPPING ////

		// Returns boolean indicating if the swap was successful.
		// Requires that the two signal graphs have exactly the same
		// structure.
		function hotSwap(from, to)
		{
			function similar(nodeOld, nodeNew)
			{
				if (nodeOld.id !== nodeNew.id)
				{
					return false;
				}
				if (nodeOld.isOutput)
				{
					return nodeNew.isOutput;
				}
				return nodeOld.kids.length === nodeNew.kids.length;
			}
			function swap(nodeOld, nodeNew)
			{
				nodeNew.value = nodeOld.value;
				return true;
			}
			var canSwap = depthFirstTraversals(similar, from.inputs, to.inputs);
			if (canSwap)
			{
				depthFirstTraversals(swap, from.inputs, to.inputs);
			}
			from.node.parentNode.replaceChild(to.node, from.node);

			return canSwap;
		}

		// Returns false if the node operation f ever fails.
		function depthFirstTraversals(f, queueOld, queueNew)
		{
			if (queueOld.length !== queueNew.length)
			{
				return false;
			}
			queueOld = queueOld.slice(0);
			queueNew = queueNew.slice(0);

			var seen = [];
			while (queueOld.length > 0 && queueNew.length > 0)
			{
				var nodeOld = queueOld.pop();
				var nodeNew = queueNew.pop();
				if (seen.indexOf(nodeOld.id) < 0)
				{
					if (!f(nodeOld, nodeNew))
					{
						return false;
					}
					queueOld = queueOld.concat(nodeOld.kids || []);
					queueNew = queueNew.concat(nodeNew.kids || []);
					seen.push(nodeOld.id);
				}
			}
			return true;
		}
	}());

	function F2(fun)
	{
		function wrapper(a) { return function(b) { return fun(a,b); }; }
		wrapper.arity = 2;
		wrapper.func = fun;
		return wrapper;
	}

	function F3(fun)
	{
		function wrapper(a) {
			return function(b) { return function(c) { return fun(a, b, c); }; };
		}
		wrapper.arity = 3;
		wrapper.func = fun;
		return wrapper;
	}

	function F4(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return fun(a, b, c, d); }; }; };
		}
		wrapper.arity = 4;
		wrapper.func = fun;
		return wrapper;
	}

	function F5(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return fun(a, b, c, d, e); }; }; }; };
		}
		wrapper.arity = 5;
		wrapper.func = fun;
		return wrapper;
	}

	function F6(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return fun(a, b, c, d, e, f); }; }; }; }; };
		}
		wrapper.arity = 6;
		wrapper.func = fun;
		return wrapper;
	}

	function F7(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return function(g) { return fun(a, b, c, d, e, f, g); }; }; }; }; }; };
		}
		wrapper.arity = 7;
		wrapper.func = fun;
		return wrapper;
	}

	function F8(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return function(g) { return function(h) {
			return fun(a, b, c, d, e, f, g, h); }; }; }; }; }; }; };
		}
		wrapper.arity = 8;
		wrapper.func = fun;
		return wrapper;
	}

	function F9(fun)
	{
		function wrapper(a) { return function(b) { return function(c) {
			return function(d) { return function(e) { return function(f) {
			return function(g) { return function(h) { return function(i) {
			return fun(a, b, c, d, e, f, g, h, i); }; }; }; }; }; }; }; };
		}
		wrapper.arity = 9;
		wrapper.func = fun;
		return wrapper;
	}

	function A2(fun, a, b)
	{
		return fun.arity === 2
			? fun.func(a, b)
			: fun(a)(b);
	}
	function A3(fun, a, b, c)
	{
		return fun.arity === 3
			? fun.func(a, b, c)
			: fun(a)(b)(c);
	}
	function A4(fun, a, b, c, d)
	{
		return fun.arity === 4
			? fun.func(a, b, c, d)
			: fun(a)(b)(c)(d);
	}
	function A5(fun, a, b, c, d, e)
	{
		return fun.arity === 5
			? fun.func(a, b, c, d, e)
			: fun(a)(b)(c)(d)(e);
	}
	function A6(fun, a, b, c, d, e, f)
	{
		return fun.arity === 6
			? fun.func(a, b, c, d, e, f)
			: fun(a)(b)(c)(d)(e)(f);
	}
	function A7(fun, a, b, c, d, e, f, g)
	{
		return fun.arity === 7
			? fun.func(a, b, c, d, e, f, g)
			: fun(a)(b)(c)(d)(e)(f)(g);
	}
	function A8(fun, a, b, c, d, e, f, g, h)
	{
		return fun.arity === 8
			? fun.func(a, b, c, d, e, f, g, h)
			: fun(a)(b)(c)(d)(e)(f)(g)(h);
	}
	function A9(fun, a, b, c, d, e, f, g, h, i)
	{
		return fun.arity === 9
			? fun.func(a, b, c, d, e, f, g, h, i)
			: fun(a)(b)(c)(d)(e)(f)(g)(h)(i);
	}
}

Elm.Native = Elm.Native || {};
Elm.Native.Utils = {};
Elm.Native.Utils.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Utils = localRuntime.Native.Utils || {};
	if (localRuntime.Native.Utils.values)
	{
		return localRuntime.Native.Utils.values;
	}


	// COMPARISONS

	function eq(l, r)
	{
		var stack = [{'x': l, 'y': r}];
		while (stack.length > 0)
		{
			var front = stack.pop();
			var x = front.x;
			var y = front.y;
			if (x === y)
			{
				continue;
			}
			if (typeof x === 'object')
			{
				var c = 0;
				for (var i in x)
				{
					++c;
					if (i in y)
					{
						if (i !== 'ctor')
						{
							stack.push({ 'x': x[i], 'y': y[i] });
						}
					}
					else
					{
						return false;
					}
				}
				if ('ctor' in x)
				{
					stack.push({'x': x.ctor, 'y': y.ctor});
				}
				if (c !== Object.keys(y).length)
				{
					return false;
				}
			}
			else if (typeof x === 'function')
			{
				throw new Error('Equality error: general function equality is ' +
								'undecidable, and therefore, unsupported');
			}
			else
			{
				return false;
			}
		}
		return true;
	}

	// code in Generate/JavaScript.hs depends on the particular
	// integer values assigned to LT, EQ, and GT
	var LT = -1, EQ = 0, GT = 1, ord = ['LT', 'EQ', 'GT'];

	function compare(x, y)
	{
		return {
			ctor: ord[cmp(x, y) + 1]
		};
	}

	function cmp(x, y) {
		var ord;
		if (typeof x !== 'object')
		{
			return x === y ? EQ : x < y ? LT : GT;
		}
		else if (x.isChar)
		{
			var a = x.toString();
			var b = y.toString();
			return a === b
				? EQ
				: a < b
					? LT
					: GT;
		}
		else if (x.ctor === '::' || x.ctor === '[]')
		{
			while (true)
			{
				if (x.ctor === '[]' && y.ctor === '[]')
				{
					return EQ;
				}
				if (x.ctor !== y.ctor)
				{
					return x.ctor === '[]' ? LT : GT;
				}
				ord = cmp(x._0, y._0);
				if (ord !== EQ)
				{
					return ord;
				}
				x = x._1;
				y = y._1;
			}
		}
		else if (x.ctor.slice(0, 6) === '_Tuple')
		{
			var n = x.ctor.slice(6) - 0;
			var err = 'cannot compare tuples with more than 6 elements.';
			if (n === 0) return EQ;
			if (n >= 1) { ord = cmp(x._0, y._0); if (ord !== EQ) return ord;
			if (n >= 2) { ord = cmp(x._1, y._1); if (ord !== EQ) return ord;
			if (n >= 3) { ord = cmp(x._2, y._2); if (ord !== EQ) return ord;
			if (n >= 4) { ord = cmp(x._3, y._3); if (ord !== EQ) return ord;
			if (n >= 5) { ord = cmp(x._4, y._4); if (ord !== EQ) return ord;
			if (n >= 6) { ord = cmp(x._5, y._5); if (ord !== EQ) return ord;
			if (n >= 7) throw new Error('Comparison error: ' + err); } } } } } }
			return EQ;
		}
		else
		{
			throw new Error('Comparison error: comparison is only defined on ints, ' +
							'floats, times, chars, strings, lists of comparable values, ' +
							'and tuples of comparable values.');
		}
	}


	// TUPLES

	var Tuple0 = {
		ctor: '_Tuple0'
	};

	function Tuple2(x, y)
	{
		return {
			ctor: '_Tuple2',
			_0: x,
			_1: y
		};
	}


	// LITERALS

	function chr(c)
	{
		var x = new String(c);
		x.isChar = true;
		return x;
	}

	function txt(str)
	{
		var t = new String(str);
		t.text = true;
		return t;
	}


	// GUID

	var count = 0;
	function guid(_)
	{
		return count++;
	}


	// RECORDS

	function update(oldRecord, updatedFields)
	{
		var newRecord = {};
		for (var key in oldRecord)
		{
			var value = (key in updatedFields) ? updatedFields[key] : oldRecord[key];
			newRecord[key] = value;
		}
		return newRecord;
	}


	// MOUSE COORDINATES

	function getXY(e)
	{
		var posx = 0;
		var posy = 0;
		if (e.pageX || e.pageY)
		{
			posx = e.pageX;
			posy = e.pageY;
		}
		else if (e.clientX || e.clientY)
		{
			posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}

		if (localRuntime.isEmbed())
		{
			var rect = localRuntime.node.getBoundingClientRect();
			var relx = rect.left + document.body.scrollLeft + document.documentElement.scrollLeft;
			var rely = rect.top + document.body.scrollTop + document.documentElement.scrollTop;
			// TODO: figure out if there is a way to avoid rounding here
			posx = posx - Math.round(relx) - localRuntime.node.clientLeft;
			posy = posy - Math.round(rely) - localRuntime.node.clientTop;
		}
		return Tuple2(posx, posy);
	}


	//// LIST STUFF ////

	var Nil = { ctor: '[]' };

	function Cons(hd, tl)
	{
		return {
			ctor: '::',
			_0: hd,
			_1: tl
		};
	}

	function list(arr)
	{
		var out = Nil;
		for (var i = arr.length; i--; )
		{
			out = Cons(arr[i], out);
		}
		return out;
	}

	function range(lo, hi)
	{
		var list = Nil;
		if (lo <= hi)
		{
			do
			{
				list = Cons(hi, list);
			}
			while (hi-- > lo);
		}
		return list;
	}

	function append(xs, ys)
	{
		// append Strings
		if (typeof xs === 'string')
		{
			return xs + ys;
		}

		// append Text
		if (xs.ctor.slice(0, 5) === 'Text:')
		{
			return {
				ctor: 'Text:Append',
				_0: xs,
				_1: ys
			};
		}


		// append Lists
		if (xs.ctor === '[]')
		{
			return ys;
		}
		var root = Cons(xs._0, Nil);
		var curr = root;
		xs = xs._1;
		while (xs.ctor !== '[]')
		{
			curr._1 = Cons(xs._0, Nil);
			xs = xs._1;
			curr = curr._1;
		}
		curr._1 = ys;
		return root;
	}


	// CRASHES

	function crash(moduleName, region)
	{
		return function(message) {
			throw new Error(
				'Ran into a `Debug.crash` in module `' + moduleName + '` ' + regionToString(region) + '\n'
				+ 'The message provided by the code author is:\n\n    '
				+ message
			);
		};
	}

	function crashCase(moduleName, region, value)
	{
		return function(message) {
			throw new Error(
				'Ran into a `Debug.crash` in module `' + moduleName + '`\n\n'
				+ 'This was caused by the `case` expression ' + regionToString(region) + '.\n'
				+ 'One of the branches ended with a crash and the following value got through:\n\n    ' + toString(value) + '\n\n'
				+ 'The message provided by the code author is:\n\n    '
				+ message
			);
		};
	}

	function regionToString(region)
	{
		if (region.start.line == region.end.line)
		{
			return 'on line ' + region.start.line;
		}
		return 'between lines ' + region.start.line + ' and ' + region.end.line;
	}


	// BAD PORTS

	function badPort(expected, received)
	{
		throw new Error(
			'Runtime error when sending values through a port.\n\n'
			+ 'Expecting ' + expected + ' but was given ' + formatValue(received)
		);
	}

	function formatValue(value)
	{
		// Explicity format undefined values as "undefined"
		// because JSON.stringify(undefined) unhelpfully returns ""
		return (value === undefined) ? "undefined" : JSON.stringify(value);
	}


	// TO STRING

	var _Array;
	var Dict;
	var List;

	var toString = function(v)
	{
		var type = typeof v;
		if (type === 'function')
		{
			var name = v.func ? v.func.name : v.name;
			return '<function' + (name === '' ? '' : ': ') + name + '>';
		}
		else if (type === 'boolean')
		{
			return v ? 'True' : 'False';
		}
		else if (type === 'number')
		{
			return v + '';
		}
		else if ((v instanceof String) && v.isChar)
		{
			return '\'' + addSlashes(v, true) + '\'';
		}
		else if (type === 'string')
		{
			return '"' + addSlashes(v, false) + '"';
		}
		else if (type === 'object' && 'ctor' in v)
		{
			if (v.ctor.substring(0, 6) === '_Tuple')
			{
				var output = [];
				for (var k in v)
				{
					if (k === 'ctor') continue;
					output.push(toString(v[k]));
				}
				return '(' + output.join(',') + ')';
			}
			else if (v.ctor === '_Array')
			{
				if (!_Array)
				{
					_Array = Elm.Array.make(localRuntime);
				}
				var list = _Array.toList(v);
				return 'Array.fromList ' + toString(list);
			}
			else if (v.ctor === '::')
			{
				var output = '[' + toString(v._0);
				v = v._1;
				while (v.ctor === '::')
				{
					output += ',' + toString(v._0);
					v = v._1;
				}
				return output + ']';
			}
			else if (v.ctor === '[]')
			{
				return '[]';
			}
			else if (v.ctor === 'RBNode_elm_builtin' || v.ctor === 'RBEmpty_elm_builtin' || v.ctor === 'Set_elm_builtin')
			{
				if (!Dict)
				{
					Dict = Elm.Dict.make(localRuntime);
				}
				var list;
				var name;
				if (v.ctor === 'Set_elm_builtin')
				{
					if (!List)
					{
						List = Elm.List.make(localRuntime);
					}
					name = 'Set';
					list = A2(List.map, function(x) {return x._0; }, Dict.toList(v._0));
				}
				else
				{
					name = 'Dict';
					list = Dict.toList(v);
				}
				return name + '.fromList ' + toString(list);
			}
			else if (v.ctor.slice(0, 5) === 'Text:')
			{
				return '<text>';
			}
			else if (v.ctor === 'Element_elm_builtin')
			{
				return '<element>'
			}
			else if (v.ctor === 'Form_elm_builtin')
			{
				return '<form>'
			}
			else
			{
				var output = '';
				for (var i in v)
				{
					if (i === 'ctor') continue;
					var str = toString(v[i]);
					var parenless = str[0] === '{' || str[0] === '<' || str.indexOf(' ') < 0;
					output += ' ' + (parenless ? str : '(' + str + ')');
				}
				return v.ctor + output;
			}
		}
		else if (type === 'object' && 'notify' in v && 'id' in v)
		{
			return '<signal>';
		}
		else if (type === 'object')
		{
			var output = [];
			for (var k in v)
			{
				output.push(k + ' = ' + toString(v[k]));
			}
			if (output.length === 0)
			{
				return '{}';
			}
			return '{ ' + output.join(', ') + ' }';
		}
		return '<internal structure>';
	};

	function addSlashes(str, isChar)
	{
		var s = str.replace(/\\/g, '\\\\')
				  .replace(/\n/g, '\\n')
				  .replace(/\t/g, '\\t')
				  .replace(/\r/g, '\\r')
				  .replace(/\v/g, '\\v')
				  .replace(/\0/g, '\\0');
		if (isChar)
		{
			return s.replace(/\'/g, '\\\'');
		}
		else
		{
			return s.replace(/\"/g, '\\"');
		}
	}


	return localRuntime.Native.Utils.values = {
		eq: eq,
		cmp: cmp,
		compare: F2(compare),
		Tuple0: Tuple0,
		Tuple2: Tuple2,
		chr: chr,
		txt: txt,
		update: update,
		guid: guid,
		getXY: getXY,

		Nil: Nil,
		Cons: Cons,
		list: list,
		range: range,
		append: F2(append),

		crash: crash,
		crashCase: crashCase,
		badPort: badPort,

		toString: toString
	};
};

Elm.Basics = Elm.Basics || {};
Elm.Basics.make = function (_elm) {
   "use strict";
   _elm.Basics = _elm.Basics || {};
   if (_elm.Basics.values) return _elm.Basics.values;
   var _U = Elm.Native.Utils.make(_elm),$Native$Basics = Elm.Native.Basics.make(_elm),$Native$Utils = Elm.Native.Utils.make(_elm);
   var _op = {};
   var uncurry = F2(function (f,_p0) {    var _p1 = _p0;return A2(f,_p1._0,_p1._1);});
   var curry = F3(function (f,a,b) {    return f({ctor: "_Tuple2",_0: a,_1: b});});
   var flip = F3(function (f,b,a) {    return A2(f,a,b);});
   var snd = function (_p2) {    var _p3 = _p2;return _p3._1;};
   var fst = function (_p4) {    var _p5 = _p4;return _p5._0;};
   var always = F2(function (a,_p6) {    return a;});
   var identity = function (x) {    return x;};
   _op["<|"] = F2(function (f,x) {    return f(x);});
   _op["|>"] = F2(function (x,f) {    return f(x);});
   _op[">>"] = F3(function (f,g,x) {    return g(f(x));});
   _op["<<"] = F3(function (g,f,x) {    return g(f(x));});
   _op["++"] = $Native$Utils.append;
   var toString = $Native$Utils.toString;
   var isInfinite = $Native$Basics.isInfinite;
   var isNaN = $Native$Basics.isNaN;
   var toFloat = $Native$Basics.toFloat;
   var ceiling = $Native$Basics.ceiling;
   var floor = $Native$Basics.floor;
   var truncate = $Native$Basics.truncate;
   var round = $Native$Basics.round;
   var not = $Native$Basics.not;
   var xor = $Native$Basics.xor;
   _op["||"] = $Native$Basics.or;
   _op["&&"] = $Native$Basics.and;
   var max = $Native$Basics.max;
   var min = $Native$Basics.min;
   var GT = {ctor: "GT"};
   var EQ = {ctor: "EQ"};
   var LT = {ctor: "LT"};
   var compare = $Native$Basics.compare;
   _op[">="] = $Native$Basics.ge;
   _op["<="] = $Native$Basics.le;
   _op[">"] = $Native$Basics.gt;
   _op["<"] = $Native$Basics.lt;
   _op["/="] = $Native$Basics.neq;
   _op["=="] = $Native$Basics.eq;
   var e = $Native$Basics.e;
   var pi = $Native$Basics.pi;
   var clamp = $Native$Basics.clamp;
   var logBase = $Native$Basics.logBase;
   var abs = $Native$Basics.abs;
   var negate = $Native$Basics.negate;
   var sqrt = $Native$Basics.sqrt;
   var atan2 = $Native$Basics.atan2;
   var atan = $Native$Basics.atan;
   var asin = $Native$Basics.asin;
   var acos = $Native$Basics.acos;
   var tan = $Native$Basics.tan;
   var sin = $Native$Basics.sin;
   var cos = $Native$Basics.cos;
   _op["^"] = $Native$Basics.exp;
   _op["%"] = $Native$Basics.mod;
   var rem = $Native$Basics.rem;
   _op["//"] = $Native$Basics.div;
   _op["/"] = $Native$Basics.floatDiv;
   _op["*"] = $Native$Basics.mul;
   _op["-"] = $Native$Basics.sub;
   _op["+"] = $Native$Basics.add;
   var toPolar = $Native$Basics.toPolar;
   var fromPolar = $Native$Basics.fromPolar;
   var turns = $Native$Basics.turns;
   var degrees = $Native$Basics.degrees;
   var radians = function (t) {    return t;};
   return _elm.Basics.values = {_op: _op
                               ,max: max
                               ,min: min
                               ,compare: compare
                               ,not: not
                               ,xor: xor
                               ,rem: rem
                               ,negate: negate
                               ,abs: abs
                               ,sqrt: sqrt
                               ,clamp: clamp
                               ,logBase: logBase
                               ,e: e
                               ,pi: pi
                               ,cos: cos
                               ,sin: sin
                               ,tan: tan
                               ,acos: acos
                               ,asin: asin
                               ,atan: atan
                               ,atan2: atan2
                               ,round: round
                               ,floor: floor
                               ,ceiling: ceiling
                               ,truncate: truncate
                               ,toFloat: toFloat
                               ,degrees: degrees
                               ,radians: radians
                               ,turns: turns
                               ,toPolar: toPolar
                               ,fromPolar: fromPolar
                               ,isNaN: isNaN
                               ,isInfinite: isInfinite
                               ,toString: toString
                               ,fst: fst
                               ,snd: snd
                               ,identity: identity
                               ,always: always
                               ,flip: flip
                               ,curry: curry
                               ,uncurry: uncurry
                               ,LT: LT
                               ,EQ: EQ
                               ,GT: GT};
};
Elm.Maybe = Elm.Maybe || {};
Elm.Maybe.make = function (_elm) {
   "use strict";
   _elm.Maybe = _elm.Maybe || {};
   if (_elm.Maybe.values) return _elm.Maybe.values;
   var _U = Elm.Native.Utils.make(_elm);
   var _op = {};
   var withDefault = F2(function ($default,maybe) {    var _p0 = maybe;if (_p0.ctor === "Just") {    return _p0._0;} else {    return $default;}});
   var Nothing = {ctor: "Nothing"};
   var oneOf = function (maybes) {
      oneOf: while (true) {
         var _p1 = maybes;
         if (_p1.ctor === "[]") {
               return Nothing;
            } else {
               var _p3 = _p1._0;
               var _p2 = _p3;
               if (_p2.ctor === "Nothing") {
                     var _v3 = _p1._1;
                     maybes = _v3;
                     continue oneOf;
                  } else {
                     return _p3;
                  }
            }
      }
   };
   var andThen = F2(function (maybeValue,callback) {
      var _p4 = maybeValue;
      if (_p4.ctor === "Just") {
            return callback(_p4._0);
         } else {
            return Nothing;
         }
   });
   var Just = function (a) {    return {ctor: "Just",_0: a};};
   var map = F2(function (f,maybe) {    var _p5 = maybe;if (_p5.ctor === "Just") {    return Just(f(_p5._0));} else {    return Nothing;}});
   var map2 = F3(function (func,ma,mb) {
      var _p6 = {ctor: "_Tuple2",_0: ma,_1: mb};
      if (_p6.ctor === "_Tuple2" && _p6._0.ctor === "Just" && _p6._1.ctor === "Just") {
            return Just(A2(func,_p6._0._0,_p6._1._0));
         } else {
            return Nothing;
         }
   });
   var map3 = F4(function (func,ma,mb,mc) {
      var _p7 = {ctor: "_Tuple3",_0: ma,_1: mb,_2: mc};
      if (_p7.ctor === "_Tuple3" && _p7._0.ctor === "Just" && _p7._1.ctor === "Just" && _p7._2.ctor === "Just") {
            return Just(A3(func,_p7._0._0,_p7._1._0,_p7._2._0));
         } else {
            return Nothing;
         }
   });
   var map4 = F5(function (func,ma,mb,mc,md) {
      var _p8 = {ctor: "_Tuple4",_0: ma,_1: mb,_2: mc,_3: md};
      if (_p8.ctor === "_Tuple4" && _p8._0.ctor === "Just" && _p8._1.ctor === "Just" && _p8._2.ctor === "Just" && _p8._3.ctor === "Just") {
            return Just(A4(func,_p8._0._0,_p8._1._0,_p8._2._0,_p8._3._0));
         } else {
            return Nothing;
         }
   });
   var map5 = F6(function (func,ma,mb,mc,md,me) {
      var _p9 = {ctor: "_Tuple5",_0: ma,_1: mb,_2: mc,_3: md,_4: me};
      if (_p9.ctor === "_Tuple5" && _p9._0.ctor === "Just" && _p9._1.ctor === "Just" && _p9._2.ctor === "Just" && _p9._3.ctor === "Just" && _p9._4.ctor === "Just")
      {
            return Just(A5(func,_p9._0._0,_p9._1._0,_p9._2._0,_p9._3._0,_p9._4._0));
         } else {
            return Nothing;
         }
   });
   return _elm.Maybe.values = {_op: _op
                              ,andThen: andThen
                              ,map: map
                              ,map2: map2
                              ,map3: map3
                              ,map4: map4
                              ,map5: map5
                              ,withDefault: withDefault
                              ,oneOf: oneOf
                              ,Just: Just
                              ,Nothing: Nothing};
};
Elm.Native.List = {};
Elm.Native.List.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.List = localRuntime.Native.List || {};
	if (localRuntime.Native.List.values)
	{
		return localRuntime.Native.List.values;
	}
	if ('values' in Elm.Native.List)
	{
		return localRuntime.Native.List.values = Elm.Native.List.values;
	}

	var Utils = Elm.Native.Utils.make(localRuntime);

	var Nil = Utils.Nil;
	var Cons = Utils.Cons;

	var fromArray = Utils.list;

	function toArray(xs)
	{
		var out = [];
		while (xs.ctor !== '[]')
		{
			out.push(xs._0);
			xs = xs._1;
		}
		return out;
	}

	// f defined similarly for both foldl and foldr (NB: different from Haskell)
	// ie, foldl : (a -> b -> b) -> b -> [a] -> b
	function foldl(f, b, xs)
	{
		var acc = b;
		while (xs.ctor !== '[]')
		{
			acc = A2(f, xs._0, acc);
			xs = xs._1;
		}
		return acc;
	}

	function foldr(f, b, xs)
	{
		var arr = toArray(xs);
		var acc = b;
		for (var i = arr.length; i--; )
		{
			acc = A2(f, arr[i], acc);
		}
		return acc;
	}

	function map2(f, xs, ys)
	{
		var arr = [];
		while (xs.ctor !== '[]' && ys.ctor !== '[]')
		{
			arr.push(A2(f, xs._0, ys._0));
			xs = xs._1;
			ys = ys._1;
		}
		return fromArray(arr);
	}

	function map3(f, xs, ys, zs)
	{
		var arr = [];
		while (xs.ctor !== '[]' && ys.ctor !== '[]' && zs.ctor !== '[]')
		{
			arr.push(A3(f, xs._0, ys._0, zs._0));
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function map4(f, ws, xs, ys, zs)
	{
		var arr = [];
		while (   ws.ctor !== '[]'
			   && xs.ctor !== '[]'
			   && ys.ctor !== '[]'
			   && zs.ctor !== '[]')
		{
			arr.push(A4(f, ws._0, xs._0, ys._0, zs._0));
			ws = ws._1;
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function map5(f, vs, ws, xs, ys, zs)
	{
		var arr = [];
		while (   vs.ctor !== '[]'
			   && ws.ctor !== '[]'
			   && xs.ctor !== '[]'
			   && ys.ctor !== '[]'
			   && zs.ctor !== '[]')
		{
			arr.push(A5(f, vs._0, ws._0, xs._0, ys._0, zs._0));
			vs = vs._1;
			ws = ws._1;
			xs = xs._1;
			ys = ys._1;
			zs = zs._1;
		}
		return fromArray(arr);
	}

	function sortBy(f, xs)
	{
		return fromArray(toArray(xs).sort(function(a, b) {
			return Utils.cmp(f(a), f(b));
		}));
	}

	function sortWith(f, xs)
	{
		return fromArray(toArray(xs).sort(function(a, b) {
			var ord = f(a)(b).ctor;
			return ord === 'EQ' ? 0 : ord === 'LT' ? -1 : 1;
		}));
	}

	function take(n, xs)
	{
		var arr = [];
		while (xs.ctor !== '[]' && n > 0)
		{
			arr.push(xs._0);
			xs = xs._1;
			--n;
		}
		return fromArray(arr);
	}


	Elm.Native.List.values = {
		Nil: Nil,
		Cons: Cons,
		cons: F2(Cons),
		toArray: toArray,
		fromArray: fromArray,

		foldl: F3(foldl),
		foldr: F3(foldr),

		map2: F3(map2),
		map3: F4(map3),
		map4: F5(map4),
		map5: F6(map5),
		sortBy: F2(sortBy),
		sortWith: F2(sortWith),
		take: F2(take)
	};
	return localRuntime.Native.List.values = Elm.Native.List.values;
};

Elm.List = Elm.List || {};
Elm.List.make = function (_elm) {
   "use strict";
   _elm.List = _elm.List || {};
   if (_elm.List.values) return _elm.List.values;
   var _U = Elm.Native.Utils.make(_elm),$Basics = Elm.Basics.make(_elm),$Maybe = Elm.Maybe.make(_elm),$Native$List = Elm.Native.List.make(_elm);
   var _op = {};
   var sortWith = $Native$List.sortWith;
   var sortBy = $Native$List.sortBy;
   var sort = function (xs) {    return A2(sortBy,$Basics.identity,xs);};
   var drop = F2(function (n,list) {
      drop: while (true) if (_U.cmp(n,0) < 1) return list; else {
            var _p0 = list;
            if (_p0.ctor === "[]") {
                  return list;
               } else {
                  var _v1 = n - 1,_v2 = _p0._1;
                  n = _v1;
                  list = _v2;
                  continue drop;
               }
         }
   });
   var take = $Native$List.take;
   var map5 = $Native$List.map5;
   var map4 = $Native$List.map4;
   var map3 = $Native$List.map3;
   var map2 = $Native$List.map2;
   var any = F2(function (isOkay,list) {
      any: while (true) {
         var _p1 = list;
         if (_p1.ctor === "[]") {
               return false;
            } else {
               if (isOkay(_p1._0)) return true; else {
                     var _v4 = isOkay,_v5 = _p1._1;
                     isOkay = _v4;
                     list = _v5;
                     continue any;
                  }
            }
      }
   });
   var all = F2(function (isOkay,list) {    return $Basics.not(A2(any,function (_p2) {    return $Basics.not(isOkay(_p2));},list));});
   var foldr = $Native$List.foldr;
   var foldl = $Native$List.foldl;
   var length = function (xs) {    return A3(foldl,F2(function (_p3,i) {    return i + 1;}),0,xs);};
   var sum = function (numbers) {    return A3(foldl,F2(function (x,y) {    return x + y;}),0,numbers);};
   var product = function (numbers) {    return A3(foldl,F2(function (x,y) {    return x * y;}),1,numbers);};
   var maximum = function (list) {
      var _p4 = list;
      if (_p4.ctor === "::") {
            return $Maybe.Just(A3(foldl,$Basics.max,_p4._0,_p4._1));
         } else {
            return $Maybe.Nothing;
         }
   };
   var minimum = function (list) {
      var _p5 = list;
      if (_p5.ctor === "::") {
            return $Maybe.Just(A3(foldl,$Basics.min,_p5._0,_p5._1));
         } else {
            return $Maybe.Nothing;
         }
   };
   var indexedMap = F2(function (f,xs) {    return A3(map2,f,_U.range(0,length(xs) - 1),xs);});
   var member = F2(function (x,xs) {    return A2(any,function (a) {    return _U.eq(a,x);},xs);});
   var isEmpty = function (xs) {    var _p6 = xs;if (_p6.ctor === "[]") {    return true;} else {    return false;}};
   var tail = function (list) {    var _p7 = list;if (_p7.ctor === "::") {    return $Maybe.Just(_p7._1);} else {    return $Maybe.Nothing;}};
   var head = function (list) {    var _p8 = list;if (_p8.ctor === "::") {    return $Maybe.Just(_p8._0);} else {    return $Maybe.Nothing;}};
   _op["::"] = $Native$List.cons;
   var map = F2(function (f,xs) {    return A3(foldr,F2(function (x,acc) {    return A2(_op["::"],f(x),acc);}),_U.list([]),xs);});
   var filter = F2(function (pred,xs) {
      var conditionalCons = F2(function (x,xs$) {    return pred(x) ? A2(_op["::"],x,xs$) : xs$;});
      return A3(foldr,conditionalCons,_U.list([]),xs);
   });
   var maybeCons = F3(function (f,mx,xs) {    var _p9 = f(mx);if (_p9.ctor === "Just") {    return A2(_op["::"],_p9._0,xs);} else {    return xs;}});
   var filterMap = F2(function (f,xs) {    return A3(foldr,maybeCons(f),_U.list([]),xs);});
   var reverse = function (list) {    return A3(foldl,F2(function (x,y) {    return A2(_op["::"],x,y);}),_U.list([]),list);};
   var scanl = F3(function (f,b,xs) {
      var scan1 = F2(function (x,accAcc) {
         var _p10 = accAcc;
         if (_p10.ctor === "::") {
               return A2(_op["::"],A2(f,x,_p10._0),accAcc);
            } else {
               return _U.list([]);
            }
      });
      return reverse(A3(foldl,scan1,_U.list([b]),xs));
   });
   var append = F2(function (xs,ys) {
      var _p11 = ys;
      if (_p11.ctor === "[]") {
            return xs;
         } else {
            return A3(foldr,F2(function (x,y) {    return A2(_op["::"],x,y);}),ys,xs);
         }
   });
   var concat = function (lists) {    return A3(foldr,append,_U.list([]),lists);};
   var concatMap = F2(function (f,list) {    return concat(A2(map,f,list));});
   var partition = F2(function (pred,list) {
      var step = F2(function (x,_p12) {
         var _p13 = _p12;
         var _p15 = _p13._0;
         var _p14 = _p13._1;
         return pred(x) ? {ctor: "_Tuple2",_0: A2(_op["::"],x,_p15),_1: _p14} : {ctor: "_Tuple2",_0: _p15,_1: A2(_op["::"],x,_p14)};
      });
      return A3(foldr,step,{ctor: "_Tuple2",_0: _U.list([]),_1: _U.list([])},list);
   });
   var unzip = function (pairs) {
      var step = F2(function (_p17,_p16) {
         var _p18 = _p17;
         var _p19 = _p16;
         return {ctor: "_Tuple2",_0: A2(_op["::"],_p18._0,_p19._0),_1: A2(_op["::"],_p18._1,_p19._1)};
      });
      return A3(foldr,step,{ctor: "_Tuple2",_0: _U.list([]),_1: _U.list([])},pairs);
   };
   var intersperse = F2(function (sep,xs) {
      var _p20 = xs;
      if (_p20.ctor === "[]") {
            return _U.list([]);
         } else {
            var step = F2(function (x,rest) {    return A2(_op["::"],sep,A2(_op["::"],x,rest));});
            var spersed = A3(foldr,step,_U.list([]),_p20._1);
            return A2(_op["::"],_p20._0,spersed);
         }
   });
   var repeatHelp = F3(function (result,n,value) {
      repeatHelp: while (true) if (_U.cmp(n,0) < 1) return result; else {
            var _v18 = A2(_op["::"],value,result),_v19 = n - 1,_v20 = value;
            result = _v18;
            n = _v19;
            value = _v20;
            continue repeatHelp;
         }
   });
   var repeat = F2(function (n,value) {    return A3(repeatHelp,_U.list([]),n,value);});
   return _elm.List.values = {_op: _op
                             ,isEmpty: isEmpty
                             ,length: length
                             ,reverse: reverse
                             ,member: member
                             ,head: head
                             ,tail: tail
                             ,filter: filter
                             ,take: take
                             ,drop: drop
                             ,repeat: repeat
                             ,append: append
                             ,concat: concat
                             ,intersperse: intersperse
                             ,partition: partition
                             ,unzip: unzip
                             ,map: map
                             ,map2: map2
                             ,map3: map3
                             ,map4: map4
                             ,map5: map5
                             ,filterMap: filterMap
                             ,concatMap: concatMap
                             ,indexedMap: indexedMap
                             ,foldr: foldr
                             ,foldl: foldl
                             ,sum: sum
                             ,product: product
                             ,maximum: maximum
                             ,minimum: minimum
                             ,all: all
                             ,any: any
                             ,scanl: scanl
                             ,sort: sort
                             ,sortBy: sortBy
                             ,sortWith: sortWith};
};
Elm.Native.Color = {};
Elm.Native.Color.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Color = localRuntime.Native.Color || {};
	if (localRuntime.Native.Color.values)
	{
		return localRuntime.Native.Color.values;
	}

	function toCss(c)
	{
		var format = '';
		var colors = '';
		if (c.ctor === 'RGBA')
		{
			format = 'rgb';
			colors = c._0 + ', ' + c._1 + ', ' + c._2;
		}
		else
		{
			format = 'hsl';
			colors = (c._0 * 180 / Math.PI) + ', ' +
					 (c._1 * 100) + '%, ' +
					 (c._2 * 100) + '%';
		}
		if (c._3 === 1)
		{
			return format + '(' + colors + ')';
		}
		else
		{
			return format + 'a(' + colors + ', ' + c._3 + ')';
		}
	}

	return localRuntime.Native.Color.values = {
		toCss: toCss
	};
};

Elm.Color = Elm.Color || {};
Elm.Color.make = function (_elm) {
   "use strict";
   _elm.Color = _elm.Color || {};
   if (_elm.Color.values) return _elm.Color.values;
   var _U = Elm.Native.Utils.make(_elm),$Basics = Elm.Basics.make(_elm);
   var _op = {};
   var Radial = F5(function (a,b,c,d,e) {    return {ctor: "Radial",_0: a,_1: b,_2: c,_3: d,_4: e};});
   var radial = Radial;
   var Linear = F3(function (a,b,c) {    return {ctor: "Linear",_0: a,_1: b,_2: c};});
   var linear = Linear;
   var fmod = F2(function (f,n) {    var integer = $Basics.floor(f);return $Basics.toFloat(A2($Basics._op["%"],integer,n)) + f - $Basics.toFloat(integer);});
   var rgbToHsl = F3(function (red,green,blue) {
      var b = $Basics.toFloat(blue) / 255;
      var g = $Basics.toFloat(green) / 255;
      var r = $Basics.toFloat(red) / 255;
      var cMax = A2($Basics.max,A2($Basics.max,r,g),b);
      var cMin = A2($Basics.min,A2($Basics.min,r,g),b);
      var c = cMax - cMin;
      var lightness = (cMax + cMin) / 2;
      var saturation = _U.eq(lightness,0) ? 0 : c / (1 - $Basics.abs(2 * lightness - 1));
      var hue = $Basics.degrees(60) * (_U.eq(cMax,r) ? A2(fmod,(g - b) / c,6) : _U.eq(cMax,g) ? (b - r) / c + 2 : (r - g) / c + 4);
      return {ctor: "_Tuple3",_0: hue,_1: saturation,_2: lightness};
   });
   var hslToRgb = F3(function (hue,saturation,lightness) {
      var hue$ = hue / $Basics.degrees(60);
      var chroma = (1 - $Basics.abs(2 * lightness - 1)) * saturation;
      var x = chroma * (1 - $Basics.abs(A2(fmod,hue$,2) - 1));
      var _p0 = _U.cmp(hue$,0) < 0 ? {ctor: "_Tuple3",_0: 0,_1: 0,_2: 0} : _U.cmp(hue$,1) < 0 ? {ctor: "_Tuple3",_0: chroma,_1: x,_2: 0} : _U.cmp(hue$,
      2) < 0 ? {ctor: "_Tuple3",_0: x,_1: chroma,_2: 0} : _U.cmp(hue$,3) < 0 ? {ctor: "_Tuple3",_0: 0,_1: chroma,_2: x} : _U.cmp(hue$,4) < 0 ? {ctor: "_Tuple3"
                                                                                                                                               ,_0: 0
                                                                                                                                               ,_1: x
                                                                                                                                               ,_2: chroma} : _U.cmp(hue$,
      5) < 0 ? {ctor: "_Tuple3",_0: x,_1: 0,_2: chroma} : _U.cmp(hue$,6) < 0 ? {ctor: "_Tuple3",_0: chroma,_1: 0,_2: x} : {ctor: "_Tuple3",_0: 0,_1: 0,_2: 0};
      var r = _p0._0;
      var g = _p0._1;
      var b = _p0._2;
      var m = lightness - chroma / 2;
      return {ctor: "_Tuple3",_0: r + m,_1: g + m,_2: b + m};
   });
   var toRgb = function (color) {
      var _p1 = color;
      if (_p1.ctor === "RGBA") {
            return {red: _p1._0,green: _p1._1,blue: _p1._2,alpha: _p1._3};
         } else {
            var _p2 = A3(hslToRgb,_p1._0,_p1._1,_p1._2);
            var r = _p2._0;
            var g = _p2._1;
            var b = _p2._2;
            return {red: $Basics.round(255 * r),green: $Basics.round(255 * g),blue: $Basics.round(255 * b),alpha: _p1._3};
         }
   };
   var toHsl = function (color) {
      var _p3 = color;
      if (_p3.ctor === "HSLA") {
            return {hue: _p3._0,saturation: _p3._1,lightness: _p3._2,alpha: _p3._3};
         } else {
            var _p4 = A3(rgbToHsl,_p3._0,_p3._1,_p3._2);
            var h = _p4._0;
            var s = _p4._1;
            var l = _p4._2;
            return {hue: h,saturation: s,lightness: l,alpha: _p3._3};
         }
   };
   var HSLA = F4(function (a,b,c,d) {    return {ctor: "HSLA",_0: a,_1: b,_2: c,_3: d};});
   var hsla = F4(function (hue,saturation,lightness,alpha) {
      return A4(HSLA,hue - $Basics.turns($Basics.toFloat($Basics.floor(hue / (2 * $Basics.pi)))),saturation,lightness,alpha);
   });
   var hsl = F3(function (hue,saturation,lightness) {    return A4(hsla,hue,saturation,lightness,1);});
   var complement = function (color) {
      var _p5 = color;
      if (_p5.ctor === "HSLA") {
            return A4(hsla,_p5._0 + $Basics.degrees(180),_p5._1,_p5._2,_p5._3);
         } else {
            var _p6 = A3(rgbToHsl,_p5._0,_p5._1,_p5._2);
            var h = _p6._0;
            var s = _p6._1;
            var l = _p6._2;
            return A4(hsla,h + $Basics.degrees(180),s,l,_p5._3);
         }
   };
   var grayscale = function (p) {    return A4(HSLA,0,0,1 - p,1);};
   var greyscale = function (p) {    return A4(HSLA,0,0,1 - p,1);};
   var RGBA = F4(function (a,b,c,d) {    return {ctor: "RGBA",_0: a,_1: b,_2: c,_3: d};});
   var rgba = RGBA;
   var rgb = F3(function (r,g,b) {    return A4(RGBA,r,g,b,1);});
   var lightRed = A4(RGBA,239,41,41,1);
   var red = A4(RGBA,204,0,0,1);
   var darkRed = A4(RGBA,164,0,0,1);
   var lightOrange = A4(RGBA,252,175,62,1);
   var orange = A4(RGBA,245,121,0,1);
   var darkOrange = A4(RGBA,206,92,0,1);
   var lightYellow = A4(RGBA,255,233,79,1);
   var yellow = A4(RGBA,237,212,0,1);
   var darkYellow = A4(RGBA,196,160,0,1);
   var lightGreen = A4(RGBA,138,226,52,1);
   var green = A4(RGBA,115,210,22,1);
   var darkGreen = A4(RGBA,78,154,6,1);
   var lightBlue = A4(RGBA,114,159,207,1);
   var blue = A4(RGBA,52,101,164,1);
   var darkBlue = A4(RGBA,32,74,135,1);
   var lightPurple = A4(RGBA,173,127,168,1);
   var purple = A4(RGBA,117,80,123,1);
   var darkPurple = A4(RGBA,92,53,102,1);
   var lightBrown = A4(RGBA,233,185,110,1);
   var brown = A4(RGBA,193,125,17,1);
   var darkBrown = A4(RGBA,143,89,2,1);
   var black = A4(RGBA,0,0,0,1);
   var white = A4(RGBA,255,255,255,1);
   var lightGrey = A4(RGBA,238,238,236,1);
   var grey = A4(RGBA,211,215,207,1);
   var darkGrey = A4(RGBA,186,189,182,1);
   var lightGray = A4(RGBA,238,238,236,1);
   var gray = A4(RGBA,211,215,207,1);
   var darkGray = A4(RGBA,186,189,182,1);
   var lightCharcoal = A4(RGBA,136,138,133,1);
   var charcoal = A4(RGBA,85,87,83,1);
   var darkCharcoal = A4(RGBA,46,52,54,1);
   return _elm.Color.values = {_op: _op
                              ,rgb: rgb
                              ,rgba: rgba
                              ,hsl: hsl
                              ,hsla: hsla
                              ,greyscale: greyscale
                              ,grayscale: grayscale
                              ,complement: complement
                              ,linear: linear
                              ,radial: radial
                              ,toRgb: toRgb
                              ,toHsl: toHsl
                              ,red: red
                              ,orange: orange
                              ,yellow: yellow
                              ,green: green
                              ,blue: blue
                              ,purple: purple
                              ,brown: brown
                              ,lightRed: lightRed
                              ,lightOrange: lightOrange
                              ,lightYellow: lightYellow
                              ,lightGreen: lightGreen
                              ,lightBlue: lightBlue
                              ,lightPurple: lightPurple
                              ,lightBrown: lightBrown
                              ,darkRed: darkRed
                              ,darkOrange: darkOrange
                              ,darkYellow: darkYellow
                              ,darkGreen: darkGreen
                              ,darkBlue: darkBlue
                              ,darkPurple: darkPurple
                              ,darkBrown: darkBrown
                              ,white: white
                              ,lightGrey: lightGrey
                              ,grey: grey
                              ,darkGrey: darkGrey
                              ,lightCharcoal: lightCharcoal
                              ,charcoal: charcoal
                              ,darkCharcoal: darkCharcoal
                              ,black: black
                              ,lightGray: lightGray
                              ,gray: gray
                              ,darkGray: darkGray};
};
Elm.Native.Signal = {};

Elm.Native.Signal.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Signal = localRuntime.Native.Signal || {};
	if (localRuntime.Native.Signal.values)
	{
		return localRuntime.Native.Signal.values;
	}


	var Task = Elm.Native.Task.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);


	function broadcastToKids(node, timestamp, update)
	{
		var kids = node.kids;
		for (var i = kids.length; i--; )
		{
			kids[i].notify(timestamp, update, node.id);
		}
	}


	// INPUT

	function input(name, base)
	{
		var node = {
			id: Utils.guid(),
			name: 'input-' + name,
			value: base,
			parents: [],
			kids: []
		};

		node.notify = function(timestamp, targetId, value) {
			var update = targetId === node.id;
			if (update)
			{
				node.value = value;
			}
			broadcastToKids(node, timestamp, update);
			return update;
		};

		localRuntime.inputs.push(node);

		return node;
	}

	function constant(value)
	{
		return input('constant', value);
	}


	// MAILBOX

	function mailbox(base)
	{
		var signal = input('mailbox', base);

		function send(value) {
			return Task.asyncFunction(function(callback) {
				localRuntime.setTimeout(function() {
					localRuntime.notify(signal.id, value);
				}, 0);
				callback(Task.succeed(Utils.Tuple0));
			});
		}

		return {
			signal: signal,
			address: {
				ctor: 'Address',
				_0: send
			}
		};
	}

	function sendMessage(message)
	{
		Task.perform(message._0);
	}


	// OUTPUT

	function output(name, handler, parent)
	{
		var node = {
			id: Utils.guid(),
			name: 'output-' + name,
			parents: [parent],
			isOutput: true
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentUpdate)
			{
				handler(parent.value);
			}
		};

		parent.kids.push(node);

		return node;
	}


	// MAP

	function mapMany(refreshValue, args)
	{
		var node = {
			id: Utils.guid(),
			name: 'map' + args.length,
			value: refreshValue(),
			parents: args,
			kids: []
		};

		var numberOfParents = args.length;
		var count = 0;
		var update = false;

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			++count;

			update = update || parentUpdate;

			if (count === numberOfParents)
			{
				if (update)
				{
					node.value = refreshValue();
				}
				broadcastToKids(node, timestamp, update);
				update = false;
				count = 0;
			}
		};

		for (var i = numberOfParents; i--; )
		{
			args[i].kids.push(node);
		}

		return node;
	}


	function map(func, a)
	{
		function refreshValue()
		{
			return func(a.value);
		}
		return mapMany(refreshValue, [a]);
	}


	function map2(func, a, b)
	{
		function refreshValue()
		{
			return A2( func, a.value, b.value );
		}
		return mapMany(refreshValue, [a, b]);
	}


	function map3(func, a, b, c)
	{
		function refreshValue()
		{
			return A3( func, a.value, b.value, c.value );
		}
		return mapMany(refreshValue, [a, b, c]);
	}


	function map4(func, a, b, c, d)
	{
		function refreshValue()
		{
			return A4( func, a.value, b.value, c.value, d.value );
		}
		return mapMany(refreshValue, [a, b, c, d]);
	}


	function map5(func, a, b, c, d, e)
	{
		function refreshValue()
		{
			return A5( func, a.value, b.value, c.value, d.value, e.value );
		}
		return mapMany(refreshValue, [a, b, c, d, e]);
	}


	// FOLD

	function foldp(update, state, signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'foldp',
			parents: [signal],
			kids: [],
			value: state
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentUpdate)
			{
				node.value = A2( update, signal.value, node.value );
			}
			broadcastToKids(node, timestamp, parentUpdate);
		};

		signal.kids.push(node);

		return node;
	}


	// TIME

	function timestamp(signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'timestamp',
			value: Utils.Tuple2(localRuntime.timer.programStart, signal.value),
			parents: [signal],
			kids: []
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentUpdate)
			{
				node.value = Utils.Tuple2(timestamp, signal.value);
			}
			broadcastToKids(node, timestamp, parentUpdate);
		};

		signal.kids.push(node);

		return node;
	}


	function delay(time, signal)
	{
		var delayed = input('delay-input-' + time, signal.value);

		function handler(value)
		{
			setTimeout(function() {
				localRuntime.notify(delayed.id, value);
			}, time);
		}

		output('delay-output-' + time, handler, signal);

		return delayed;
	}


	// MERGING

	function genericMerge(tieBreaker, leftStream, rightStream)
	{
		var node = {
			id: Utils.guid(),
			name: 'merge',
			value: A2(tieBreaker, leftStream.value, rightStream.value),
			parents: [leftStream, rightStream],
			kids: []
		};

		var left = { touched: false, update: false, value: null };
		var right = { touched: false, update: false, value: null };

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentID === leftStream.id)
			{
				left.touched = true;
				left.update = parentUpdate;
				left.value = leftStream.value;
			}
			if (parentID === rightStream.id)
			{
				right.touched = true;
				right.update = parentUpdate;
				right.value = rightStream.value;
			}

			if (left.touched && right.touched)
			{
				var update = false;
				if (left.update && right.update)
				{
					node.value = A2(tieBreaker, left.value, right.value);
					update = true;
				}
				else if (left.update)
				{
					node.value = left.value;
					update = true;
				}
				else if (right.update)
				{
					node.value = right.value;
					update = true;
				}
				left.touched = false;
				right.touched = false;

				broadcastToKids(node, timestamp, update);
			}
		};

		leftStream.kids.push(node);
		rightStream.kids.push(node);

		return node;
	}


	// FILTERING

	function filterMap(toMaybe, base, signal)
	{
		var maybe = toMaybe(signal.value);
		var node = {
			id: Utils.guid(),
			name: 'filterMap',
			value: maybe.ctor === 'Nothing' ? base : maybe._0,
			parents: [signal],
			kids: []
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			var update = false;
			if (parentUpdate)
			{
				var maybe = toMaybe(signal.value);
				if (maybe.ctor === 'Just')
				{
					update = true;
					node.value = maybe._0;
				}
			}
			broadcastToKids(node, timestamp, update);
		};

		signal.kids.push(node);

		return node;
	}


	// SAMPLING

	function sampleOn(ticker, signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'sampleOn',
			value: signal.value,
			parents: [ticker, signal],
			kids: []
		};

		var signalTouch = false;
		var tickerTouch = false;
		var tickerUpdate = false;

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			if (parentID === ticker.id)
			{
				tickerTouch = true;
				tickerUpdate = parentUpdate;
			}
			if (parentID === signal.id)
			{
				signalTouch = true;
			}

			if (tickerTouch && signalTouch)
			{
				if (tickerUpdate)
				{
					node.value = signal.value;
				}
				tickerTouch = false;
				signalTouch = false;

				broadcastToKids(node, timestamp, tickerUpdate);
			}
		};

		ticker.kids.push(node);
		signal.kids.push(node);

		return node;
	}


	// DROP REPEATS

	function dropRepeats(signal)
	{
		var node = {
			id: Utils.guid(),
			name: 'dropRepeats',
			value: signal.value,
			parents: [signal],
			kids: []
		};

		node.notify = function(timestamp, parentUpdate, parentID)
		{
			var update = false;
			if (parentUpdate && !Utils.eq(node.value, signal.value))
			{
				node.value = signal.value;
				update = true;
			}
			broadcastToKids(node, timestamp, update);
		};

		signal.kids.push(node);

		return node;
	}


	return localRuntime.Native.Signal.values = {
		input: input,
		constant: constant,
		mailbox: mailbox,
		sendMessage: sendMessage,
		output: output,
		map: F2(map),
		map2: F3(map2),
		map3: F4(map3),
		map4: F5(map4),
		map5: F6(map5),
		foldp: F3(foldp),
		genericMerge: F3(genericMerge),
		filterMap: F3(filterMap),
		sampleOn: F2(sampleOn),
		dropRepeats: dropRepeats,
		timestamp: timestamp,
		delay: F2(delay)
	};
};

Elm.Native.Transform2D = {};
Elm.Native.Transform2D.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Transform2D = localRuntime.Native.Transform2D || {};
	if (localRuntime.Native.Transform2D.values)
	{
		return localRuntime.Native.Transform2D.values;
	}

	var A;
	if (typeof Float32Array === 'undefined')
	{
		A = function(arr)
		{
			this.length = arr.length;
			this[0] = arr[0];
			this[1] = arr[1];
			this[2] = arr[2];
			this[3] = arr[3];
			this[4] = arr[4];
			this[5] = arr[5];
		};
	}
	else
	{
		A = Float32Array;
	}

	// layout of matrix in an array is
	//
	//   | m11 m12 dx |
	//   | m21 m22 dy |
	//   |  0   0   1 |
	//
	//  new A([ m11, m12, dx, m21, m22, dy ])

	var identity = new A([1, 0, 0, 0, 1, 0]);
	function matrix(m11, m12, m21, m22, dx, dy)
	{
		return new A([m11, m12, dx, m21, m22, dy]);
	}

	function rotation(t)
	{
		var c = Math.cos(t);
		var s = Math.sin(t);
		return new A([c, -s, 0, s, c, 0]);
	}

	function rotate(t, m)
	{
		var c = Math.cos(t);
		var s = Math.sin(t);
		var m11 = m[0], m12 = m[1], m21 = m[3], m22 = m[4];
		return new A([m11 * c + m12 * s, -m11 * s + m12 * c, m[2],
					  m21 * c + m22 * s, -m21 * s + m22 * c, m[5]]);
	}
	/*
	function move(xy,m) {
		var x = xy._0;
		var y = xy._1;
		var m11 = m[0], m12 = m[1], m21 = m[3], m22 = m[4];
		return new A([m11, m12, m11*x + m12*y + m[2],
					  m21, m22, m21*x + m22*y + m[5]]);
	}
	function scale(s,m) { return new A([m[0]*s, m[1]*s, m[2], m[3]*s, m[4]*s, m[5]]); }
	function scaleX(x,m) { return new A([m[0]*x, m[1], m[2], m[3]*x, m[4], m[5]]); }
	function scaleY(y,m) { return new A([m[0], m[1]*y, m[2], m[3], m[4]*y, m[5]]); }
	function reflectX(m) { return new A([-m[0], m[1], m[2], -m[3], m[4], m[5]]); }
	function reflectY(m) { return new A([m[0], -m[1], m[2], m[3], -m[4], m[5]]); }

	function transform(m11, m21, m12, m22, mdx, mdy, n) {
		var n11 = n[0], n12 = n[1], n21 = n[3], n22 = n[4], ndx = n[2], ndy = n[5];
		return new A([m11*n11 + m12*n21,
					  m11*n12 + m12*n22,
					  m11*ndx + m12*ndy + mdx,
					  m21*n11 + m22*n21,
					  m21*n12 + m22*n22,
					  m21*ndx + m22*ndy + mdy]);
	}
	*/
	function multiply(m, n)
	{
		var m11 = m[0], m12 = m[1], m21 = m[3], m22 = m[4], mdx = m[2], mdy = m[5];
		var n11 = n[0], n12 = n[1], n21 = n[3], n22 = n[4], ndx = n[2], ndy = n[5];
		return new A([m11 * n11 + m12 * n21,
					  m11 * n12 + m12 * n22,
					  m11 * ndx + m12 * ndy + mdx,
					  m21 * n11 + m22 * n21,
					  m21 * n12 + m22 * n22,
					  m21 * ndx + m22 * ndy + mdy]);
	}

	return localRuntime.Native.Transform2D.values = {
		identity: identity,
		matrix: F6(matrix),
		rotation: rotation,
		multiply: F2(multiply)
		/*
		transform: F7(transform),
		rotate: F2(rotate),
		move: F2(move),
		scale: F2(scale),
		scaleX: F2(scaleX),
		scaleY: F2(scaleY),
		reflectX: reflectX,
		reflectY: reflectY
		*/
	};
};

Elm.Transform2D = Elm.Transform2D || {};
Elm.Transform2D.make = function (_elm) {
   "use strict";
   _elm.Transform2D = _elm.Transform2D || {};
   if (_elm.Transform2D.values) return _elm.Transform2D.values;
   var _U = Elm.Native.Utils.make(_elm),$Native$Transform2D = Elm.Native.Transform2D.make(_elm);
   var _op = {};
   var multiply = $Native$Transform2D.multiply;
   var rotation = $Native$Transform2D.rotation;
   var matrix = $Native$Transform2D.matrix;
   var translation = F2(function (x,y) {    return A6(matrix,1,0,0,1,x,y);});
   var scale = function (s) {    return A6(matrix,s,0,0,s,0,0);};
   var scaleX = function (x) {    return A6(matrix,x,0,0,1,0,0);};
   var scaleY = function (y) {    return A6(matrix,1,0,0,y,0,0);};
   var identity = $Native$Transform2D.identity;
   var Transform2D = {ctor: "Transform2D"};
   return _elm.Transform2D.values = {_op: _op
                                    ,identity: identity
                                    ,matrix: matrix
                                    ,multiply: multiply
                                    ,rotation: rotation
                                    ,translation: translation
                                    ,scale: scale
                                    ,scaleX: scaleX
                                    ,scaleY: scaleY};
};

// setup
Elm.Native = Elm.Native || {};
Elm.Native.Graphics = Elm.Native.Graphics || {};
Elm.Native.Graphics.Collage = Elm.Native.Graphics.Collage || {};

// definition
Elm.Native.Graphics.Collage.make = function(localRuntime) {
	'use strict';

	// attempt to short-circuit
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Graphics = localRuntime.Native.Graphics || {};
	localRuntime.Native.Graphics.Collage = localRuntime.Native.Graphics.Collage || {};
	if ('values' in localRuntime.Native.Graphics.Collage)
	{
		return localRuntime.Native.Graphics.Collage.values;
	}

	// okay, we cannot short-ciruit, so now we define everything
	var Color = Elm.Native.Color.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var NativeElement = Elm.Native.Graphics.Element.make(localRuntime);
	var Transform = Elm.Transform2D.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);

	function setStrokeStyle(ctx, style)
	{
		ctx.lineWidth = style.width;

		var cap = style.cap.ctor;
		ctx.lineCap = cap === 'Flat'
			? 'butt'
			: cap === 'Round'
				? 'round'
				: 'square';

		var join = style.join.ctor;
		ctx.lineJoin = join === 'Smooth'
			? 'round'
			: join === 'Sharp'
				? 'miter'
				: 'bevel';

		ctx.miterLimit = style.join._0 || 10;
		ctx.strokeStyle = Color.toCss(style.color);
	}

	function setFillStyle(redo, ctx, style)
	{
		var sty = style.ctor;
		ctx.fillStyle = sty === 'Solid'
			? Color.toCss(style._0)
			: sty === 'Texture'
				? texture(redo, ctx, style._0)
				: gradient(ctx, style._0);
	}

	function trace(ctx, path)
	{
		var points = List.toArray(path);
		var i = points.length - 1;
		if (i <= 0)
		{
			return;
		}
		ctx.moveTo(points[i]._0, points[i]._1);
		while (i--)
		{
			ctx.lineTo(points[i]._0, points[i]._1);
		}
		if (path.closed)
		{
			i = points.length - 1;
			ctx.lineTo(points[i]._0, points[i]._1);
		}
	}

	function line(ctx, style, path)
	{
		if (style.dashing.ctor === '[]')
		{
			trace(ctx, path);
		}
		else
		{
			customLineHelp(ctx, style, path);
		}
		ctx.scale(1, -1);
		ctx.stroke();
	}

	function customLineHelp(ctx, style, path)
	{
		var points = List.toArray(path);
		if (path.closed)
		{
			points.push(points[0]);
		}
		var pattern = List.toArray(style.dashing);
		var i = points.length - 1;
		if (i <= 0)
		{
			return;
		}
		var x0 = points[i]._0, y0 = points[i]._1;
		var x1 = 0, y1 = 0, dx = 0, dy = 0, remaining = 0;
		var pindex = 0, plen = pattern.length;
		var draw = true, segmentLength = pattern[0];
		ctx.moveTo(x0, y0);
		while (i--)
		{
			x1 = points[i]._0;
			y1 = points[i]._1;
			dx = x1 - x0;
			dy = y1 - y0;
			remaining = Math.sqrt(dx * dx + dy * dy);
			while (segmentLength <= remaining)
			{
				x0 += dx * segmentLength / remaining;
				y0 += dy * segmentLength / remaining;
				ctx[draw ? 'lineTo' : 'moveTo'](x0, y0);
				// update starting position
				dx = x1 - x0;
				dy = y1 - y0;
				remaining = Math.sqrt(dx * dx + dy * dy);
				// update pattern
				draw = !draw;
				pindex = (pindex + 1) % plen;
				segmentLength = pattern[pindex];
			}
			if (remaining > 0)
			{
				ctx[draw ? 'lineTo' : 'moveTo'](x1, y1);
				segmentLength -= remaining;
			}
			x0 = x1;
			y0 = y1;
		}
	}

	function drawLine(ctx, style, path)
	{
		setStrokeStyle(ctx, style);
		return line(ctx, style, path);
	}

	function texture(redo, ctx, src)
	{
		var img = new Image();
		img.src = src;
		img.onload = redo;
		return ctx.createPattern(img, 'repeat');
	}

	function gradient(ctx, grad)
	{
		var g;
		var stops = [];
		if (grad.ctor === 'Linear')
		{
			var p0 = grad._0, p1 = grad._1;
			g = ctx.createLinearGradient(p0._0, -p0._1, p1._0, -p1._1);
			stops = List.toArray(grad._2);
		}
		else
		{
			var p0 = grad._0, p2 = grad._2;
			g = ctx.createRadialGradient(p0._0, -p0._1, grad._1, p2._0, -p2._1, grad._3);
			stops = List.toArray(grad._4);
		}
		var len = stops.length;
		for (var i = 0; i < len; ++i)
		{
			var stop = stops[i];
			g.addColorStop(stop._0, Color.toCss(stop._1));
		}
		return g;
	}

	function drawShape(redo, ctx, style, path)
	{
		trace(ctx, path);
		setFillStyle(redo, ctx, style);
		ctx.scale(1, -1);
		ctx.fill();
	}


	// TEXT RENDERING

	function fillText(redo, ctx, text)
	{
		drawText(ctx, text, ctx.fillText);
	}

	function strokeText(redo, ctx, style, text)
	{
		setStrokeStyle(ctx, style);
		// Use native canvas API for dashes only for text for now
		// Degrades to non-dashed on IE 9 + 10
		if (style.dashing.ctor !== '[]' && ctx.setLineDash)
		{
			var pattern = List.toArray(style.dashing);
			ctx.setLineDash(pattern);
		}
		drawText(ctx, text, ctx.strokeText);
	}

	function drawText(ctx, text, canvasDrawFn)
	{
		var textChunks = chunkText(defaultContext, text);

		var totalWidth = 0;
		var maxHeight = 0;
		var numChunks = textChunks.length;

		ctx.scale(1,-1);

		for (var i = numChunks; i--; )
		{
			var chunk = textChunks[i];
			ctx.font = chunk.font;
			var metrics = ctx.measureText(chunk.text);
			chunk.width = metrics.width;
			totalWidth += chunk.width;
			if (chunk.height > maxHeight)
			{
				maxHeight = chunk.height;
			}
		}

		var x = -totalWidth / 2.0;
		for (var i = 0; i < numChunks; ++i)
		{
			var chunk = textChunks[i];
			ctx.font = chunk.font;
			ctx.fillStyle = chunk.color;
			canvasDrawFn.call(ctx, chunk.text, x, maxHeight / 2);
			x += chunk.width;
		}
	}

	function toFont(props)
	{
		return [
			props['font-style'],
			props['font-variant'],
			props['font-weight'],
			props['font-size'],
			props['font-family']
		].join(' ');
	}


	// Convert the object returned by the text module
	// into something we can use for styling canvas text
	function chunkText(context, text)
	{
		var tag = text.ctor;
		if (tag === 'Text:Append')
		{
			var leftChunks = chunkText(context, text._0);
			var rightChunks = chunkText(context, text._1);
			return leftChunks.concat(rightChunks);
		}
		if (tag === 'Text:Text')
		{
			return [{
				text: text._0,
				color: context.color,
				height: context['font-size'].slice(0, -2) | 0,
				font: toFont(context)
			}];
		}
		if (tag === 'Text:Meta')
		{
			var newContext = freshContext(text._0, context);
			return chunkText(newContext, text._1);
		}
	}

	function freshContext(props, ctx)
	{
		return {
			'font-style': props['font-style'] || ctx['font-style'],
			'font-variant': props['font-variant'] || ctx['font-variant'],
			'font-weight': props['font-weight'] || ctx['font-weight'],
			'font-size': props['font-size'] || ctx['font-size'],
			'font-family': props['font-family'] || ctx['font-family'],
			'color': props['color'] || ctx['color']
		};
	}

	var defaultContext = {
		'font-style': 'normal',
		'font-variant': 'normal',
		'font-weight': 'normal',
		'font-size': '12px',
		'font-family': 'sans-serif',
		'color': 'black'
	};


	// IMAGES

	function drawImage(redo, ctx, form)
	{
		var img = new Image();
		img.onload = redo;
		img.src = form._3;
		var w = form._0,
			h = form._1,
			pos = form._2,
			srcX = pos._0,
			srcY = pos._1,
			srcW = w,
			srcH = h,
			destX = -w / 2,
			destY = -h / 2,
			destW = w,
			destH = h;

		ctx.scale(1, -1);
		ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
	}

	function renderForm(redo, ctx, form)
	{
		ctx.save();

		var x = form.x,
			y = form.y,
			theta = form.theta,
			scale = form.scale;

		if (x !== 0 || y !== 0)
		{
			ctx.translate(x, y);
		}
		if (theta !== 0)
		{
			ctx.rotate(theta % (Math.PI * 2));
		}
		if (scale !== 1)
		{
			ctx.scale(scale, scale);
		}
		if (form.alpha !== 1)
		{
			ctx.globalAlpha = ctx.globalAlpha * form.alpha;
		}

		ctx.beginPath();
		var f = form.form;
		switch (f.ctor)
		{
			case 'FPath':
				drawLine(ctx, f._0, f._1);
				break;

			case 'FImage':
				drawImage(redo, ctx, f);
				break;

			case 'FShape':
				if (f._0.ctor === 'Line')
				{
					f._1.closed = true;
					drawLine(ctx, f._0._0, f._1);
				}
				else
				{
					drawShape(redo, ctx, f._0._0, f._1);
				}
				break;

			case 'FText':
				fillText(redo, ctx, f._0);
				break;

			case 'FOutlinedText':
				strokeText(redo, ctx, f._0, f._1);
				break;
		}
		ctx.restore();
	}

	function formToMatrix(form)
	{
	   var scale = form.scale;
	   var matrix = A6( Transform.matrix, scale, 0, 0, scale, form.x, form.y );

	   var theta = form.theta;
	   if (theta !== 0)
	   {
		   matrix = A2( Transform.multiply, matrix, Transform.rotation(theta) );
	   }

	   return matrix;
	}

	function str(n)
	{
		if (n < 0.00001 && n > -0.00001)
		{
			return 0;
		}
		return n;
	}

	function makeTransform(w, h, form, matrices)
	{
		var props = form.form._0._0.props;
		var m = A6( Transform.matrix, 1, 0, 0, -1,
					(w - props.width ) / 2,
					(h - props.height) / 2 );
		var len = matrices.length;
		for (var i = 0; i < len; ++i)
		{
			m = A2( Transform.multiply, m, matrices[i] );
		}
		m = A2( Transform.multiply, m, formToMatrix(form) );

		return 'matrix(' +
			str( m[0]) + ', ' + str( m[3]) + ', ' +
			str(-m[1]) + ', ' + str(-m[4]) + ', ' +
			str( m[2]) + ', ' + str( m[5]) + ')';
	}

	function stepperHelp(list)
	{
		var arr = List.toArray(list);
		var i = 0;
		function peekNext()
		{
			return i < arr.length ? arr[i]._0.form.ctor : '';
		}
		// assumes that there is a next element
		function next()
		{
			var out = arr[i]._0;
			++i;
			return out;
		}
		return {
			peekNext: peekNext,
			next: next
		};
	}

	function formStepper(forms)
	{
		var ps = [stepperHelp(forms)];
		var matrices = [];
		var alphas = [];
		function peekNext()
		{
			var len = ps.length;
			var formType = '';
			for (var i = 0; i < len; ++i )
			{
				if (formType = ps[i].peekNext()) return formType;
			}
			return '';
		}
		// assumes that there is a next element
		function next(ctx)
		{
			while (!ps[0].peekNext())
			{
				ps.shift();
				matrices.pop();
				alphas.shift();
				if (ctx)
				{
					ctx.restore();
				}
			}
			var out = ps[0].next();
			var f = out.form;
			if (f.ctor === 'FGroup')
			{
				ps.unshift(stepperHelp(f._1));
				var m = A2(Transform.multiply, f._0, formToMatrix(out));
				ctx.save();
				ctx.transform(m[0], m[3], m[1], m[4], m[2], m[5]);
				matrices.push(m);

				var alpha = (alphas[0] || 1) * out.alpha;
				alphas.unshift(alpha);
				ctx.globalAlpha = alpha;
			}
			return out;
		}
		function transforms()
		{
			return matrices;
		}
		function alpha()
		{
			return alphas[0] || 1;
		}
		return {
			peekNext: peekNext,
			next: next,
			transforms: transforms,
			alpha: alpha
		};
	}

	function makeCanvas(w, h)
	{
		var canvas = NativeElement.createNode('canvas');
		canvas.style.width  = w + 'px';
		canvas.style.height = h + 'px';
		canvas.style.display = 'block';
		canvas.style.position = 'absolute';
		var ratio = window.devicePixelRatio || 1;
		canvas.width  = w * ratio;
		canvas.height = h * ratio;
		return canvas;
	}

	function render(model)
	{
		var div = NativeElement.createNode('div');
		div.style.overflow = 'hidden';
		div.style.position = 'relative';
		update(div, model, model);
		return div;
	}

	function nodeStepper(w, h, div)
	{
		var kids = div.childNodes;
		var i = 0;
		var ratio = window.devicePixelRatio || 1;

		function transform(transforms, ctx)
		{
			ctx.translate( w / 2 * ratio, h / 2 * ratio );
			ctx.scale( ratio, -ratio );
			var len = transforms.length;
			for (var i = 0; i < len; ++i)
			{
				var m = transforms[i];
				ctx.save();
				ctx.transform(m[0], m[3], m[1], m[4], m[2], m[5]);
			}
			return ctx;
		}
		function nextContext(transforms)
		{
			while (i < kids.length)
			{
				var node = kids[i];
				if (node.getContext)
				{
					node.width = w * ratio;
					node.height = h * ratio;
					node.style.width = w + 'px';
					node.style.height = h + 'px';
					++i;
					return transform(transforms, node.getContext('2d'));
				}
				div.removeChild(node);
			}
			var canvas = makeCanvas(w, h);
			div.appendChild(canvas);
			// we have added a new node, so we must step our position
			++i;
			return transform(transforms, canvas.getContext('2d'));
		}
		function addElement(matrices, alpha, form)
		{
			var kid = kids[i];
			var elem = form.form._0;

			var node = (!kid || kid.getContext)
				? NativeElement.render(elem)
				: NativeElement.update(kid, kid.oldElement, elem);

			node.style.position = 'absolute';
			node.style.opacity = alpha * form.alpha * elem._0.props.opacity;
			NativeElement.addTransform(node.style, makeTransform(w, h, form, matrices));
			node.oldElement = elem;
			++i;
			if (!kid)
			{
				div.appendChild(node);
			}
			else
			{
				div.insertBefore(node, kid);
			}
		}
		function clearRest()
		{
			while (i < kids.length)
			{
				div.removeChild(kids[i]);
			}
		}
		return {
			nextContext: nextContext,
			addElement: addElement,
			clearRest: clearRest
		};
	}


	function update(div, _, model)
	{
		var w = model.w;
		var h = model.h;

		var forms = formStepper(model.forms);
		var nodes = nodeStepper(w, h, div);
		var ctx = null;
		var formType = '';

		while (formType = forms.peekNext())
		{
			// make sure we have context if we need it
			if (ctx === null && formType !== 'FElement')
			{
				ctx = nodes.nextContext(forms.transforms());
				ctx.globalAlpha = forms.alpha();
			}

			var form = forms.next(ctx);
			// if it is FGroup, all updates are made within formStepper when next is called.
			if (formType === 'FElement')
			{
				// update or insert an element, get a new context
				nodes.addElement(forms.transforms(), forms.alpha(), form);
				ctx = null;
			}
			else if (formType !== 'FGroup')
			{
				renderForm(function() { update(div, model, model); }, ctx, form);
			}
		}
		nodes.clearRest();
		return div;
	}


	function collage(w, h, forms)
	{
		return A3(NativeElement.newElement, w, h, {
			ctor: 'Custom',
			type: 'Collage',
			render: render,
			update: update,
			model: {w: w, h: h, forms: forms}
		});
	}

	return localRuntime.Native.Graphics.Collage.values = {
		collage: F3(collage)
	};
};


// setup
Elm.Native = Elm.Native || {};
Elm.Native.Graphics = Elm.Native.Graphics || {};
Elm.Native.Graphics.Element = Elm.Native.Graphics.Element || {};

// definition
Elm.Native.Graphics.Element.make = function(localRuntime) {
	'use strict';

	// attempt to short-circuit
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Graphics = localRuntime.Native.Graphics || {};
	localRuntime.Native.Graphics.Element = localRuntime.Native.Graphics.Element || {};
	if ('values' in localRuntime.Native.Graphics.Element)
	{
		return localRuntime.Native.Graphics.Element.values;
	}

	var Color = Elm.Native.Color.make(localRuntime);
	var List = Elm.Native.List.make(localRuntime);
	var Maybe = Elm.Maybe.make(localRuntime);
	var Text = Elm.Native.Text.make(localRuntime);
	var Utils = Elm.Native.Utils.make(localRuntime);


	// CREATION

	var createNode =
		typeof document === 'undefined'
			?
				function(_)
				{
					return {
						style: {},
						appendChild: function() {}
					};
				}
			:
				function(elementType)
				{
					var node = document.createElement(elementType);
					node.style.padding = '0';
					node.style.margin = '0';
					return node;
				}
			;


	function newElement(width, height, elementPrim)
	{
		return {
			ctor: 'Element_elm_builtin',
			_0: {
				element: elementPrim,
				props: {
					id: Utils.guid(),
					width: width,
					height: height,
					opacity: 1,
					color: Maybe.Nothing,
					href: '',
					tag: '',
					hover: Utils.Tuple0,
					click: Utils.Tuple0
				}
			}
		};
	}


	// PROPERTIES

	function setProps(elem, node)
	{
		var props = elem.props;

		var element = elem.element;
		var width = props.width - (element.adjustWidth || 0);
		var height = props.height - (element.adjustHeight || 0);
		node.style.width  = (width | 0) + 'px';
		node.style.height = (height | 0) + 'px';

		if (props.opacity !== 1)
		{
			node.style.opacity = props.opacity;
		}

		if (props.color.ctor === 'Just')
		{
			node.style.backgroundColor = Color.toCss(props.color._0);
		}

		if (props.tag !== '')
		{
			node.id = props.tag;
		}

		if (props.hover.ctor !== '_Tuple0')
		{
			addHover(node, props.hover);
		}

		if (props.click.ctor !== '_Tuple0')
		{
			addClick(node, props.click);
		}

		if (props.href !== '')
		{
			var anchor = createNode('a');
			anchor.href = props.href;
			anchor.style.display = 'block';
			anchor.style.pointerEvents = 'auto';
			anchor.appendChild(node);
			node = anchor;
		}

		return node;
	}

	function addClick(e, handler)
	{
		e.style.pointerEvents = 'auto';
		e.elm_click_handler = handler;
		function trigger(ev)
		{
			e.elm_click_handler(Utils.Tuple0);
			ev.stopPropagation();
		}
		e.elm_click_trigger = trigger;
		e.addEventListener('click', trigger);
	}

	function removeClick(e, handler)
	{
		if (e.elm_click_trigger)
		{
			e.removeEventListener('click', e.elm_click_trigger);
			e.elm_click_trigger = null;
			e.elm_click_handler = null;
		}
	}

	function addHover(e, handler)
	{
		e.style.pointerEvents = 'auto';
		e.elm_hover_handler = handler;
		e.elm_hover_count = 0;

		function over(evt)
		{
			if (e.elm_hover_count++ > 0) return;
			e.elm_hover_handler(true);
			evt.stopPropagation();
		}
		function out(evt)
		{
			if (e.contains(evt.toElement || evt.relatedTarget)) return;
			e.elm_hover_count = 0;
			e.elm_hover_handler(false);
			evt.stopPropagation();
		}
		e.elm_hover_over = over;
		e.elm_hover_out = out;
		e.addEventListener('mouseover', over);
		e.addEventListener('mouseout', out);
	}

	function removeHover(e)
	{
		e.elm_hover_handler = null;
		if (e.elm_hover_over)
		{
			e.removeEventListener('mouseover', e.elm_hover_over);
			e.elm_hover_over = null;
		}
		if (e.elm_hover_out)
		{
			e.removeEventListener('mouseout', e.elm_hover_out);
			e.elm_hover_out = null;
		}
	}


	// IMAGES

	function image(props, img)
	{
		switch (img._0.ctor)
		{
			case 'Plain':
				return plainImage(img._3);

			case 'Fitted':
				return fittedImage(props.width, props.height, img._3);

			case 'Cropped':
				return croppedImage(img, props.width, props.height, img._3);

			case 'Tiled':
				return tiledImage(img._3);
		}
	}

	function plainImage(src)
	{
		var img = createNode('img');
		img.src = src;
		img.name = src;
		img.style.display = 'block';
		return img;
	}

	function tiledImage(src)
	{
		var div = createNode('div');
		div.style.backgroundImage = 'url(' + src + ')';
		return div;
	}

	function fittedImage(w, h, src)
	{
		var div = createNode('div');
		div.style.background = 'url(' + src + ') no-repeat center';
		div.style.webkitBackgroundSize = 'cover';
		div.style.MozBackgroundSize = 'cover';
		div.style.OBackgroundSize = 'cover';
		div.style.backgroundSize = 'cover';
		return div;
	}

	function croppedImage(elem, w, h, src)
	{
		var pos = elem._0._0;
		var e = createNode('div');
		e.style.overflow = 'hidden';

		var img = createNode('img');
		img.onload = function() {
			var sw = w / elem._1, sh = h / elem._2;
			img.style.width = ((this.width * sw) | 0) + 'px';
			img.style.height = ((this.height * sh) | 0) + 'px';
			img.style.marginLeft = ((- pos._0 * sw) | 0) + 'px';
			img.style.marginTop = ((- pos._1 * sh) | 0) + 'px';
		};
		img.src = src;
		img.name = src;
		e.appendChild(img);
		return e;
	}


	// FLOW

	function goOut(node)
	{
		node.style.position = 'absolute';
		return node;
	}
	function goDown(node)
	{
		return node;
	}
	function goRight(node)
	{
		node.style.styleFloat = 'left';
		node.style.cssFloat = 'left';
		return node;
	}

	var directionTable = {
		DUp: goDown,
		DDown: goDown,
		DLeft: goRight,
		DRight: goRight,
		DIn: goOut,
		DOut: goOut
	};
	function needsReversal(dir)
	{
		return dir === 'DUp' || dir === 'DLeft' || dir === 'DIn';
	}

	function flow(dir, elist)
	{
		var array = List.toArray(elist);
		var container = createNode('div');
		var goDir = directionTable[dir];
		if (goDir === goOut)
		{
			container.style.pointerEvents = 'none';
		}
		if (needsReversal(dir))
		{
			array.reverse();
		}
		var len = array.length;
		for (var i = 0; i < len; ++i)
		{
			container.appendChild(goDir(render(array[i])));
		}
		return container;
	}


	// CONTAINER

	function toPos(pos)
	{
		return pos.ctor === 'Absolute'
			? pos._0 + 'px'
			: (pos._0 * 100) + '%';
	}

	// must clear right, left, top, bottom, and transform
	// before calling this function
	function setPos(pos, wrappedElement, e)
	{
		var elem = wrappedElement._0;
		var element = elem.element;
		var props = elem.props;
		var w = props.width + (element.adjustWidth ? element.adjustWidth : 0);
		var h = props.height + (element.adjustHeight ? element.adjustHeight : 0);

		e.style.position = 'absolute';
		e.style.margin = 'auto';
		var transform = '';

		switch (pos.horizontal.ctor)
		{
			case 'P':
				e.style.right = toPos(pos.x);
				e.style.removeProperty('left');
				break;

			case 'Z':
				transform = 'translateX(' + ((-w / 2) | 0) + 'px) ';

			case 'N':
				e.style.left = toPos(pos.x);
				e.style.removeProperty('right');
				break;
		}
		switch (pos.vertical.ctor)
		{
			case 'N':
				e.style.bottom = toPos(pos.y);
				e.style.removeProperty('top');
				break;

			case 'Z':
				transform += 'translateY(' + ((-h / 2) | 0) + 'px)';

			case 'P':
				e.style.top = toPos(pos.y);
				e.style.removeProperty('bottom');
				break;
		}
		if (transform !== '')
		{
			addTransform(e.style, transform);
		}
		return e;
	}

	function addTransform(style, transform)
	{
		style.transform       = transform;
		style.msTransform     = transform;
		style.MozTransform    = transform;
		style.webkitTransform = transform;
		style.OTransform      = transform;
	}

	function container(pos, elem)
	{
		var e = render(elem);
		setPos(pos, elem, e);
		var div = createNode('div');
		div.style.position = 'relative';
		div.style.overflow = 'hidden';
		div.appendChild(e);
		return div;
	}


	function rawHtml(elem)
	{
		var html = elem.html;
		var align = elem.align;

		var div = createNode('div');
		div.innerHTML = html;
		div.style.visibility = 'hidden';
		if (align)
		{
			div.style.textAlign = align;
		}
		div.style.visibility = 'visible';
		div.style.pointerEvents = 'auto';
		return div;
	}


	// RENDER

	function render(wrappedElement)
	{
		var elem = wrappedElement._0;
		return setProps(elem, makeElement(elem));
	}

	function makeElement(e)
	{
		var elem = e.element;
		switch (elem.ctor)
		{
			case 'Image':
				return image(e.props, elem);

			case 'Flow':
				return flow(elem._0.ctor, elem._1);

			case 'Container':
				return container(elem._0, elem._1);

			case 'Spacer':
				return createNode('div');

			case 'RawHtml':
				return rawHtml(elem);

			case 'Custom':
				return elem.render(elem.model);
		}
	}

	function updateAndReplace(node, curr, next)
	{
		var newNode = update(node, curr, next);
		if (newNode !== node)
		{
			node.parentNode.replaceChild(newNode, node);
		}
		return newNode;
	}


	// UPDATE

	function update(node, wrappedCurrent, wrappedNext)
	{
		var curr = wrappedCurrent._0;
		var next = wrappedNext._0;
		var rootNode = node;
		if (node.tagName === 'A')
		{
			node = node.firstChild;
		}
		if (curr.props.id === next.props.id)
		{
			updateProps(node, curr, next);
			return rootNode;
		}
		if (curr.element.ctor !== next.element.ctor)
		{
			return render(wrappedNext);
		}
		var nextE = next.element;
		var currE = curr.element;
		switch (nextE.ctor)
		{
			case 'Spacer':
				updateProps(node, curr, next);
				return rootNode;

			case 'RawHtml':
				if(currE.html.valueOf() !== nextE.html.valueOf())
				{
					node.innerHTML = nextE.html;
				}
				updateProps(node, curr, next);
				return rootNode;

			case 'Image':
				if (nextE._0.ctor === 'Plain')
				{
					if (nextE._3 !== currE._3)
					{
						node.src = nextE._3;
					}
				}
				else if (!Utils.eq(nextE, currE)
					|| next.props.width !== curr.props.width
					|| next.props.height !== curr.props.height)
				{
					return render(wrappedNext);
				}
				updateProps(node, curr, next);
				return rootNode;

			case 'Flow':
				var arr = List.toArray(nextE._1);
				for (var i = arr.length; i--; )
				{
					arr[i] = arr[i]._0.element.ctor;
				}
				if (nextE._0.ctor !== currE._0.ctor)
				{
					return render(wrappedNext);
				}
				var nexts = List.toArray(nextE._1);
				var kids = node.childNodes;
				if (nexts.length !== kids.length)
				{
					return render(wrappedNext);
				}
				var currs = List.toArray(currE._1);
				var dir = nextE._0.ctor;
				var goDir = directionTable[dir];
				var toReverse = needsReversal(dir);
				var len = kids.length;
				for (var i = len; i--; )
				{
					var subNode = kids[toReverse ? len - i - 1 : i];
					goDir(updateAndReplace(subNode, currs[i], nexts[i]));
				}
				updateProps(node, curr, next);
				return rootNode;

			case 'Container':
				var subNode = node.firstChild;
				var newSubNode = updateAndReplace(subNode, currE._1, nextE._1);
				setPos(nextE._0, nextE._1, newSubNode);
				updateProps(node, curr, next);
				return rootNode;

			case 'Custom':
				if (currE.type === nextE.type)
				{
					var updatedNode = nextE.update(node, currE.model, nextE.model);
					updateProps(updatedNode, curr, next);
					return updatedNode;
				}
				return render(wrappedNext);
		}
	}

	function updateProps(node, curr, next)
	{
		var nextProps = next.props;
		var currProps = curr.props;

		var element = next.element;
		var width = nextProps.width - (element.adjustWidth || 0);
		var height = nextProps.height - (element.adjustHeight || 0);
		if (width !== currProps.width)
		{
			node.style.width = (width | 0) + 'px';
		}
		if (height !== currProps.height)
		{
			node.style.height = (height | 0) + 'px';
		}

		if (nextProps.opacity !== currProps.opacity)
		{
			node.style.opacity = nextProps.opacity;
		}

		var nextColor = nextProps.color.ctor === 'Just'
			? Color.toCss(nextProps.color._0)
			: '';
		if (node.style.backgroundColor !== nextColor)
		{
			node.style.backgroundColor = nextColor;
		}

		if (nextProps.tag !== currProps.tag)
		{
			node.id = nextProps.tag;
		}

		if (nextProps.href !== currProps.href)
		{
			if (currProps.href === '')
			{
				// add a surrounding href
				var anchor = createNode('a');
				anchor.href = nextProps.href;
				anchor.style.display = 'block';
				anchor.style.pointerEvents = 'auto';

				node.parentNode.replaceChild(anchor, node);
				anchor.appendChild(node);
			}
			else if (nextProps.href === '')
			{
				// remove the surrounding href
				var anchor = node.parentNode;
				anchor.parentNode.replaceChild(node, anchor);
			}
			else
			{
				// just update the link
				node.parentNode.href = nextProps.href;
			}
		}

		// update click and hover handlers
		var removed = false;

		// update hover handlers
		if (currProps.hover.ctor === '_Tuple0')
		{
			if (nextProps.hover.ctor !== '_Tuple0')
			{
				addHover(node, nextProps.hover);
			}
		}
		else
		{
			if (nextProps.hover.ctor === '_Tuple0')
			{
				removed = true;
				removeHover(node);
			}
			else
			{
				node.elm_hover_handler = nextProps.hover;
			}
		}

		// update click handlers
		if (currProps.click.ctor === '_Tuple0')
		{
			if (nextProps.click.ctor !== '_Tuple0')
			{
				addClick(node, nextProps.click);
			}
		}
		else
		{
			if (nextProps.click.ctor === '_Tuple0')
			{
				removed = true;
				removeClick(node);
			}
			else
			{
				node.elm_click_handler = nextProps.click;
			}
		}

		// stop capturing clicks if
		if (removed
			&& nextProps.hover.ctor === '_Tuple0'
			&& nextProps.click.ctor === '_Tuple0')
		{
			node.style.pointerEvents = 'none';
		}
	}


	// TEXT

	function block(align)
	{
		return function(text)
		{
			var raw = {
				ctor: 'RawHtml',
				html: Text.renderHtml(text),
				align: align
			};
			var pos = htmlHeight(0, raw);
			return newElement(pos._0, pos._1, raw);
		};
	}

	function markdown(text)
	{
		var raw = {
			ctor: 'RawHtml',
			html: text,
			align: null
		};
		var pos = htmlHeight(0, raw);
		return newElement(pos._0, pos._1, raw);
	}

	var htmlHeight =
		typeof document !== 'undefined'
			? realHtmlHeight
			: function(a, b) { return Utils.Tuple2(0, 0); };

	function realHtmlHeight(width, rawHtml)
	{
		// create dummy node
		var temp = document.createElement('div');
		temp.innerHTML = rawHtml.html;
		if (width > 0)
		{
			temp.style.width = width + 'px';
		}
		temp.style.visibility = 'hidden';
		temp.style.styleFloat = 'left';
		temp.style.cssFloat = 'left';

		document.body.appendChild(temp);

		// get dimensions
		var style = window.getComputedStyle(temp, null);
		var w = Math.ceil(style.getPropertyValue('width').slice(0, -2) - 0);
		var h = Math.ceil(style.getPropertyValue('height').slice(0, -2) - 0);
		document.body.removeChild(temp);
		return Utils.Tuple2(w, h);
	}


	return localRuntime.Native.Graphics.Element.values = {
		render: render,
		update: update,
		updateAndReplace: updateAndReplace,

		createNode: createNode,
		newElement: F3(newElement),
		addTransform: addTransform,
		htmlHeight: F2(htmlHeight),
		guid: Utils.guid,

		block: block,
		markdown: markdown
	};
};

Elm.Native.Text = {};
Elm.Native.Text.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Text = localRuntime.Native.Text || {};
	if (localRuntime.Native.Text.values)
	{
		return localRuntime.Native.Text.values;
	}

	var toCss = Elm.Native.Color.make(localRuntime).toCss;
	var List = Elm.Native.List.make(localRuntime);


	// CONSTRUCTORS

	function fromString(str)
	{
		return {
			ctor: 'Text:Text',
			_0: str
		};
	}

	function append(a, b)
	{
		return {
			ctor: 'Text:Append',
			_0: a,
			_1: b
		};
	}

	function addMeta(field, value, text)
	{
		var newProps = {};
		var newText = {
			ctor: 'Text:Meta',
			_0: newProps,
			_1: text
		};

		if (text.ctor === 'Text:Meta')
		{
			newText._1 = text._1;
			var props = text._0;
			for (var i = metaKeys.length; i--; )
			{
				var key = metaKeys[i];
				var val = props[key];
				if (val)
				{
					newProps[key] = val;
				}
			}
		}
		newProps[field] = value;
		return newText;
	}

	var metaKeys = [
		'font-size',
		'font-family',
		'font-style',
		'font-weight',
		'href',
		'text-decoration',
		'color'
	];


	// conversions from Elm values to CSS

	function toTypefaces(list)
	{
		var typefaces = List.toArray(list);
		for (var i = typefaces.length; i--; )
		{
			var typeface = typefaces[i];
			if (typeface.indexOf(' ') > -1)
			{
				typefaces[i] = "'" + typeface + "'";
			}
		}
		return typefaces.join(',');
	}

	function toLine(line)
	{
		var ctor = line.ctor;
		return ctor === 'Under'
			? 'underline'
			: ctor === 'Over'
				? 'overline'
				: 'line-through';
	}

	// setting styles of Text

	function style(style, text)
	{
		var newText = addMeta('color', toCss(style.color), text);
		var props = newText._0;

		if (style.typeface.ctor !== '[]')
		{
			props['font-family'] = toTypefaces(style.typeface);
		}
		if (style.height.ctor !== 'Nothing')
		{
			props['font-size'] = style.height._0 + 'px';
		}
		if (style.bold)
		{
			props['font-weight'] = 'bold';
		}
		if (style.italic)
		{
			props['font-style'] = 'italic';
		}
		if (style.line.ctor !== 'Nothing')
		{
			props['text-decoration'] = toLine(style.line._0);
		}
		return newText;
	}

	function height(px, text)
	{
		return addMeta('font-size', px + 'px', text);
	}

	function typeface(names, text)
	{
		return addMeta('font-family', toTypefaces(names), text);
	}

	function monospace(text)
	{
		return addMeta('font-family', 'monospace', text);
	}

	function italic(text)
	{
		return addMeta('font-style', 'italic', text);
	}

	function bold(text)
	{
		return addMeta('font-weight', 'bold', text);
	}

	function link(href, text)
	{
		return addMeta('href', href, text);
	}

	function line(line, text)
	{
		return addMeta('text-decoration', toLine(line), text);
	}

	function color(color, text)
	{
		return addMeta('color', toCss(color), text);
	}


	// RENDER

	function renderHtml(text)
	{
		var tag = text.ctor;
		if (tag === 'Text:Append')
		{
			return renderHtml(text._0) + renderHtml(text._1);
		}
		if (tag === 'Text:Text')
		{
			return properEscape(text._0);
		}
		if (tag === 'Text:Meta')
		{
			return renderMeta(text._0, renderHtml(text._1));
		}
	}

	function renderMeta(metas, string)
	{
		var href = metas.href;
		if (href)
		{
			string = '<a href="' + href + '">' + string + '</a>';
		}
		var styles = '';
		for (var key in metas)
		{
			if (key === 'href')
			{
				continue;
			}
			styles += key + ':' + metas[key] + ';';
		}
		if (styles)
		{
			string = '<span style="' + styles + '">' + string + '</span>';
		}
		return string;
	}

	function properEscape(str)
	{
		if (str.length === 0)
		{
			return str;
		}
		str = str //.replace(/&/g,  '&#38;')
			.replace(/"/g,  '&#34;')
			.replace(/'/g,  '&#39;')
			.replace(/</g,  '&#60;')
			.replace(/>/g,  '&#62;');
		var arr = str.split('\n');
		for (var i = arr.length; i--; )
		{
			arr[i] = makeSpaces(arr[i]);
		}
		return arr.join('<br/>');
	}

	function makeSpaces(s)
	{
		if (s.length === 0)
		{
			return s;
		}
		var arr = s.split('');
		if (arr[0] === ' ')
		{
			arr[0] = '&nbsp;';
		}
		for (var i = arr.length; --i; )
		{
			if (arr[i][0] === ' ' && arr[i - 1] === ' ')
			{
				arr[i - 1] = arr[i - 1] + arr[i];
				arr[i] = '';
			}
		}
		for (var i = arr.length; i--; )
		{
			if (arr[i].length > 1 && arr[i][0] === ' ')
			{
				var spaces = arr[i].split('');
				for (var j = spaces.length - 2; j >= 0; j -= 2)
				{
					spaces[j] = '&nbsp;';
				}
				arr[i] = spaces.join('');
			}
		}
		arr = arr.join('');
		if (arr[arr.length - 1] === ' ')
		{
			return arr.slice(0, -1) + '&nbsp;';
		}
		return arr;
	}


	return localRuntime.Native.Text.values = {
		fromString: fromString,
		append: F2(append),

		height: F2(height),
		italic: italic,
		bold: bold,
		line: F2(line),
		monospace: monospace,
		typeface: F2(typeface),
		color: F2(color),
		link: F2(link),
		style: F2(style),

		toTypefaces: toTypefaces,
		toLine: toLine,
		renderHtml: renderHtml
	};
};

Elm.Text = Elm.Text || {};
Elm.Text.make = function (_elm) {
   "use strict";
   _elm.Text = _elm.Text || {};
   if (_elm.Text.values) return _elm.Text.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Color = Elm.Color.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Text = Elm.Native.Text.make(_elm);
   var _op = {};
   var line = $Native$Text.line;
   var italic = $Native$Text.italic;
   var bold = $Native$Text.bold;
   var color = $Native$Text.color;
   var height = $Native$Text.height;
   var link = $Native$Text.link;
   var monospace = $Native$Text.monospace;
   var typeface = $Native$Text.typeface;
   var style = $Native$Text.style;
   var append = $Native$Text.append;
   var fromString = $Native$Text.fromString;
   var empty = fromString("");
   var concat = function (texts) {    return A3($List.foldr,append,empty,texts);};
   var join = F2(function (seperator,texts) {    return concat(A2($List.intersperse,seperator,texts));});
   var defaultStyle = {typeface: _U.list([]),height: $Maybe.Nothing,color: $Color.black,bold: false,italic: false,line: $Maybe.Nothing};
   var Style = F6(function (a,b,c,d,e,f) {    return {typeface: a,height: b,color: c,bold: d,italic: e,line: f};});
   var Through = {ctor: "Through"};
   var Over = {ctor: "Over"};
   var Under = {ctor: "Under"};
   var Text = {ctor: "Text"};
   return _elm.Text.values = {_op: _op
                             ,fromString: fromString
                             ,empty: empty
                             ,append: append
                             ,concat: concat
                             ,join: join
                             ,link: link
                             ,style: style
                             ,defaultStyle: defaultStyle
                             ,typeface: typeface
                             ,monospace: monospace
                             ,height: height
                             ,color: color
                             ,bold: bold
                             ,italic: italic
                             ,line: line
                             ,Style: Style
                             ,Under: Under
                             ,Over: Over
                             ,Through: Through};
};
Elm.Graphics = Elm.Graphics || {};
Elm.Graphics.Element = Elm.Graphics.Element || {};
Elm.Graphics.Element.make = function (_elm) {
   "use strict";
   _elm.Graphics = _elm.Graphics || {};
   _elm.Graphics.Element = _elm.Graphics.Element || {};
   if (_elm.Graphics.Element.values) return _elm.Graphics.Element.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Color = Elm.Color.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Graphics$Element = Elm.Native.Graphics.Element.make(_elm),
   $Text = Elm.Text.make(_elm);
   var _op = {};
   var DOut = {ctor: "DOut"};
   var outward = DOut;
   var DIn = {ctor: "DIn"};
   var inward = DIn;
   var DRight = {ctor: "DRight"};
   var right = DRight;
   var DLeft = {ctor: "DLeft"};
   var left = DLeft;
   var DDown = {ctor: "DDown"};
   var down = DDown;
   var DUp = {ctor: "DUp"};
   var up = DUp;
   var RawPosition = F4(function (a,b,c,d) {    return {horizontal: a,vertical: b,x: c,y: d};});
   var Position = function (a) {    return {ctor: "Position",_0: a};};
   var Relative = function (a) {    return {ctor: "Relative",_0: a};};
   var relative = Relative;
   var Absolute = function (a) {    return {ctor: "Absolute",_0: a};};
   var absolute = Absolute;
   var N = {ctor: "N"};
   var bottomLeft = Position({horizontal: N,vertical: N,x: Absolute(0),y: Absolute(0)});
   var bottomLeftAt = F2(function (x,y) {    return Position({horizontal: N,vertical: N,x: x,y: y});});
   var Z = {ctor: "Z"};
   var middle = Position({horizontal: Z,vertical: Z,x: Relative(0.5),y: Relative(0.5)});
   var midLeft = Position({horizontal: N,vertical: Z,x: Absolute(0),y: Relative(0.5)});
   var midBottom = Position({horizontal: Z,vertical: N,x: Relative(0.5),y: Absolute(0)});
   var middleAt = F2(function (x,y) {    return Position({horizontal: Z,vertical: Z,x: x,y: y});});
   var midLeftAt = F2(function (x,y) {    return Position({horizontal: N,vertical: Z,x: x,y: y});});
   var midBottomAt = F2(function (x,y) {    return Position({horizontal: Z,vertical: N,x: x,y: y});});
   var P = {ctor: "P"};
   var topLeft = Position({horizontal: N,vertical: P,x: Absolute(0),y: Absolute(0)});
   var topRight = Position({horizontal: P,vertical: P,x: Absolute(0),y: Absolute(0)});
   var bottomRight = Position({horizontal: P,vertical: N,x: Absolute(0),y: Absolute(0)});
   var midRight = Position({horizontal: P,vertical: Z,x: Absolute(0),y: Relative(0.5)});
   var midTop = Position({horizontal: Z,vertical: P,x: Relative(0.5),y: Absolute(0)});
   var topLeftAt = F2(function (x,y) {    return Position({horizontal: N,vertical: P,x: x,y: y});});
   var topRightAt = F2(function (x,y) {    return Position({horizontal: P,vertical: P,x: x,y: y});});
   var bottomRightAt = F2(function (x,y) {    return Position({horizontal: P,vertical: N,x: x,y: y});});
   var midRightAt = F2(function (x,y) {    return Position({horizontal: P,vertical: Z,x: x,y: y});});
   var midTopAt = F2(function (x,y) {    return Position({horizontal: Z,vertical: P,x: x,y: y});});
   var justified = $Native$Graphics$Element.block("justify");
   var centered = $Native$Graphics$Element.block("center");
   var rightAligned = $Native$Graphics$Element.block("right");
   var leftAligned = $Native$Graphics$Element.block("left");
   var show = function (value) {    return leftAligned($Text.monospace($Text.fromString($Basics.toString(value))));};
   var Tiled = {ctor: "Tiled"};
   var Cropped = function (a) {    return {ctor: "Cropped",_0: a};};
   var Fitted = {ctor: "Fitted"};
   var Plain = {ctor: "Plain"};
   var Custom = {ctor: "Custom"};
   var RawHtml = {ctor: "RawHtml"};
   var Spacer = {ctor: "Spacer"};
   var Flow = F2(function (a,b) {    return {ctor: "Flow",_0: a,_1: b};});
   var Container = F2(function (a,b) {    return {ctor: "Container",_0: a,_1: b};});
   var Image = F4(function (a,b,c,d) {    return {ctor: "Image",_0: a,_1: b,_2: c,_3: d};});
   var newElement = $Native$Graphics$Element.newElement;
   var image = F3(function (w,h,src) {    return A3(newElement,w,h,A4(Image,Plain,w,h,src));});
   var fittedImage = F3(function (w,h,src) {    return A3(newElement,w,h,A4(Image,Fitted,w,h,src));});
   var croppedImage = F4(function (pos,w,h,src) {    return A3(newElement,w,h,A4(Image,Cropped(pos),w,h,src));});
   var tiledImage = F3(function (w,h,src) {    return A3(newElement,w,h,A4(Image,Tiled,w,h,src));});
   var container = F4(function (w,h,_p0,e) {    var _p1 = _p0;return A3(newElement,w,h,A2(Container,_p1._0,e));});
   var spacer = F2(function (w,h) {    return A3(newElement,w,h,Spacer);});
   var sizeOf = function (_p2) {    var _p3 = _p2;var _p4 = _p3._0;return {ctor: "_Tuple2",_0: _p4.props.width,_1: _p4.props.height};};
   var heightOf = function (_p5) {    var _p6 = _p5;return _p6._0.props.height;};
   var widthOf = function (_p7) {    var _p8 = _p7;return _p8._0.props.width;};
   var above = F2(function (hi,lo) {
      return A3(newElement,A2($Basics.max,widthOf(hi),widthOf(lo)),heightOf(hi) + heightOf(lo),A2(Flow,DDown,_U.list([hi,lo])));
   });
   var below = F2(function (lo,hi) {
      return A3(newElement,A2($Basics.max,widthOf(hi),widthOf(lo)),heightOf(hi) + heightOf(lo),A2(Flow,DDown,_U.list([hi,lo])));
   });
   var beside = F2(function (lft,rht) {
      return A3(newElement,widthOf(lft) + widthOf(rht),A2($Basics.max,heightOf(lft),heightOf(rht)),A2(Flow,right,_U.list([lft,rht])));
   });
   var layers = function (es) {
      var hs = A2($List.map,heightOf,es);
      var ws = A2($List.map,widthOf,es);
      return A3(newElement,A2($Maybe.withDefault,0,$List.maximum(ws)),A2($Maybe.withDefault,0,$List.maximum(hs)),A2(Flow,DOut,es));
   };
   var empty = A2(spacer,0,0);
   var flow = F2(function (dir,es) {
      var newFlow = F2(function (w,h) {    return A3(newElement,w,h,A2(Flow,dir,es));});
      var maxOrZero = function (list) {    return A2($Maybe.withDefault,0,$List.maximum(list));};
      var hs = A2($List.map,heightOf,es);
      var ws = A2($List.map,widthOf,es);
      if (_U.eq(es,_U.list([]))) return empty; else {
            var _p9 = dir;
            switch (_p9.ctor)
            {case "DUp": return A2(newFlow,maxOrZero(ws),$List.sum(hs));
               case "DDown": return A2(newFlow,maxOrZero(ws),$List.sum(hs));
               case "DLeft": return A2(newFlow,$List.sum(ws),maxOrZero(hs));
               case "DRight": return A2(newFlow,$List.sum(ws),maxOrZero(hs));
               case "DIn": return A2(newFlow,maxOrZero(ws),maxOrZero(hs));
               default: return A2(newFlow,maxOrZero(ws),maxOrZero(hs));}
         }
   });
   var Properties = F9(function (a,b,c,d,e,f,g,h,i) {    return {id: a,width: b,height: c,opacity: d,color: e,href: f,tag: g,hover: h,click: i};});
   var Element_elm_builtin = function (a) {    return {ctor: "Element_elm_builtin",_0: a};};
   var width = F2(function (newWidth,_p10) {
      var _p11 = _p10;
      var _p14 = _p11._0.props;
      var _p13 = _p11._0.element;
      var newHeight = function () {
         var _p12 = _p13;
         switch (_p12.ctor)
         {case "Image": return $Basics.round($Basics.toFloat(_p12._2) / $Basics.toFloat(_p12._1) * $Basics.toFloat(newWidth));
            case "RawHtml": return $Basics.snd(A2($Native$Graphics$Element.htmlHeight,newWidth,_p13));
            default: return _p14.height;}
      }();
      return Element_elm_builtin({element: _p13,props: _U.update(_p14,{width: newWidth,height: newHeight})});
   });
   var height = F2(function (newHeight,_p15) {
      var _p16 = _p15;
      return Element_elm_builtin({element: _p16._0.element,props: _U.update(_p16._0.props,{height: newHeight})});
   });
   var size = F3(function (w,h,e) {    return A2(height,h,A2(width,w,e));});
   var opacity = F2(function (givenOpacity,_p17) {
      var _p18 = _p17;
      return Element_elm_builtin({element: _p18._0.element,props: _U.update(_p18._0.props,{opacity: givenOpacity})});
   });
   var color = F2(function (clr,_p19) {
      var _p20 = _p19;
      return Element_elm_builtin({element: _p20._0.element,props: _U.update(_p20._0.props,{color: $Maybe.Just(clr)})});
   });
   var tag = F2(function (name,_p21) {    var _p22 = _p21;return Element_elm_builtin({element: _p22._0.element,props: _U.update(_p22._0.props,{tag: name})});});
   var link = F2(function (href,_p23) {
      var _p24 = _p23;
      return Element_elm_builtin({element: _p24._0.element,props: _U.update(_p24._0.props,{href: href})});
   });
   return _elm.Graphics.Element.values = {_op: _op
                                         ,image: image
                                         ,fittedImage: fittedImage
                                         ,croppedImage: croppedImage
                                         ,tiledImage: tiledImage
                                         ,leftAligned: leftAligned
                                         ,rightAligned: rightAligned
                                         ,centered: centered
                                         ,justified: justified
                                         ,show: show
                                         ,width: width
                                         ,height: height
                                         ,size: size
                                         ,color: color
                                         ,opacity: opacity
                                         ,link: link
                                         ,tag: tag
                                         ,widthOf: widthOf
                                         ,heightOf: heightOf
                                         ,sizeOf: sizeOf
                                         ,flow: flow
                                         ,up: up
                                         ,down: down
                                         ,left: left
                                         ,right: right
                                         ,inward: inward
                                         ,outward: outward
                                         ,layers: layers
                                         ,above: above
                                         ,below: below
                                         ,beside: beside
                                         ,empty: empty
                                         ,spacer: spacer
                                         ,container: container
                                         ,middle: middle
                                         ,midTop: midTop
                                         ,midBottom: midBottom
                                         ,midLeft: midLeft
                                         ,midRight: midRight
                                         ,topLeft: topLeft
                                         ,topRight: topRight
                                         ,bottomLeft: bottomLeft
                                         ,bottomRight: bottomRight
                                         ,absolute: absolute
                                         ,relative: relative
                                         ,middleAt: middleAt
                                         ,midTopAt: midTopAt
                                         ,midBottomAt: midBottomAt
                                         ,midLeftAt: midLeftAt
                                         ,midRightAt: midRightAt
                                         ,topLeftAt: topLeftAt
                                         ,topRightAt: topRightAt
                                         ,bottomLeftAt: bottomLeftAt
                                         ,bottomRightAt: bottomRightAt};
};
Elm.Graphics = Elm.Graphics || {};
Elm.Graphics.Collage = Elm.Graphics.Collage || {};
Elm.Graphics.Collage.make = function (_elm) {
   "use strict";
   _elm.Graphics = _elm.Graphics || {};
   _elm.Graphics.Collage = _elm.Graphics.Collage || {};
   if (_elm.Graphics.Collage.values) return _elm.Graphics.Collage.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Color = Elm.Color.make(_elm),
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $List = Elm.List.make(_elm),
   $Native$Graphics$Collage = Elm.Native.Graphics.Collage.make(_elm),
   $Text = Elm.Text.make(_elm),
   $Transform2D = Elm.Transform2D.make(_elm);
   var _op = {};
   var Shape = function (a) {    return {ctor: "Shape",_0: a};};
   var polygon = function (points) {    return Shape(points);};
   var rect = F2(function (w,h) {
      var hh = h / 2;
      var hw = w / 2;
      return Shape(_U.list([{ctor: "_Tuple2",_0: 0 - hw,_1: 0 - hh}
                           ,{ctor: "_Tuple2",_0: 0 - hw,_1: hh}
                           ,{ctor: "_Tuple2",_0: hw,_1: hh}
                           ,{ctor: "_Tuple2",_0: hw,_1: 0 - hh}]));
   });
   var square = function (n) {    return A2(rect,n,n);};
   var oval = F2(function (w,h) {
      var hh = h / 2;
      var hw = w / 2;
      var n = 50;
      var t = 2 * $Basics.pi / n;
      var f = function (i) {    return {ctor: "_Tuple2",_0: hw * $Basics.cos(t * i),_1: hh * $Basics.sin(t * i)};};
      return Shape(A2($List.map,f,_U.range(0,n - 1)));
   });
   var circle = function (r) {    return A2(oval,2 * r,2 * r);};
   var ngon = F2(function (n,r) {
      var m = $Basics.toFloat(n);
      var t = 2 * $Basics.pi / m;
      var f = function (i) {    return {ctor: "_Tuple2",_0: r * $Basics.cos(t * i),_1: r * $Basics.sin(t * i)};};
      return Shape(A2($List.map,f,_U.range(0,m - 1)));
   });
   var Path = function (a) {    return {ctor: "Path",_0: a};};
   var path = function (ps) {    return Path(ps);};
   var segment = F2(function (p1,p2) {    return Path(_U.list([p1,p2]));});
   var collage = $Native$Graphics$Collage.collage;
   var Fill = function (a) {    return {ctor: "Fill",_0: a};};
   var Line = function (a) {    return {ctor: "Line",_0: a};};
   var FGroup = F2(function (a,b) {    return {ctor: "FGroup",_0: a,_1: b};});
   var FElement = function (a) {    return {ctor: "FElement",_0: a};};
   var FImage = F4(function (a,b,c,d) {    return {ctor: "FImage",_0: a,_1: b,_2: c,_3: d};});
   var FText = function (a) {    return {ctor: "FText",_0: a};};
   var FOutlinedText = F2(function (a,b) {    return {ctor: "FOutlinedText",_0: a,_1: b};});
   var FShape = F2(function (a,b) {    return {ctor: "FShape",_0: a,_1: b};});
   var FPath = F2(function (a,b) {    return {ctor: "FPath",_0: a,_1: b};});
   var LineStyle = F6(function (a,b,c,d,e,f) {    return {color: a,width: b,cap: c,join: d,dashing: e,dashOffset: f};});
   var Clipped = {ctor: "Clipped"};
   var Sharp = function (a) {    return {ctor: "Sharp",_0: a};};
   var Smooth = {ctor: "Smooth"};
   var Padded = {ctor: "Padded"};
   var Round = {ctor: "Round"};
   var Flat = {ctor: "Flat"};
   var defaultLine = {color: $Color.black,width: 1,cap: Flat,join: Sharp(10),dashing: _U.list([]),dashOffset: 0};
   var solid = function (clr) {    return _U.update(defaultLine,{color: clr});};
   var dashed = function (clr) {    return _U.update(defaultLine,{color: clr,dashing: _U.list([8,4])});};
   var dotted = function (clr) {    return _U.update(defaultLine,{color: clr,dashing: _U.list([3,3])});};
   var Grad = function (a) {    return {ctor: "Grad",_0: a};};
   var Texture = function (a) {    return {ctor: "Texture",_0: a};};
   var Solid = function (a) {    return {ctor: "Solid",_0: a};};
   var Form_elm_builtin = function (a) {    return {ctor: "Form_elm_builtin",_0: a};};
   var form = function (f) {    return Form_elm_builtin({theta: 0,scale: 1,x: 0,y: 0,alpha: 1,form: f});};
   var fill = F2(function (style,_p0) {    var _p1 = _p0;return form(A2(FShape,Fill(style),_p1._0));});
   var filled = F2(function (color,shape) {    return A2(fill,Solid(color),shape);});
   var textured = F2(function (src,shape) {    return A2(fill,Texture(src),shape);});
   var gradient = F2(function (grad,shape) {    return A2(fill,Grad(grad),shape);});
   var outlined = F2(function (style,_p2) {    var _p3 = _p2;return form(A2(FShape,Line(style),_p3._0));});
   var traced = F2(function (style,_p4) {    var _p5 = _p4;return form(A2(FPath,style,_p5._0));});
   var sprite = F4(function (w,h,pos,src) {    return form(A4(FImage,w,h,pos,src));});
   var toForm = function (e) {    return form(FElement(e));};
   var group = function (fs) {    return form(A2(FGroup,$Transform2D.identity,fs));};
   var groupTransform = F2(function (matrix,fs) {    return form(A2(FGroup,matrix,fs));});
   var text = function (t) {    return form(FText(t));};
   var outlinedText = F2(function (ls,t) {    return form(A2(FOutlinedText,ls,t));});
   var move = F2(function (_p7,_p6) {
      var _p8 = _p7;
      var _p9 = _p6;
      var _p10 = _p9._0;
      return Form_elm_builtin(_U.update(_p10,{x: _p10.x + _p8._0,y: _p10.y + _p8._1}));
   });
   var moveX = F2(function (x,_p11) {    var _p12 = _p11;var _p13 = _p12._0;return Form_elm_builtin(_U.update(_p13,{x: _p13.x + x}));});
   var moveY = F2(function (y,_p14) {    var _p15 = _p14;var _p16 = _p15._0;return Form_elm_builtin(_U.update(_p16,{y: _p16.y + y}));});
   var scale = F2(function (s,_p17) {    var _p18 = _p17;var _p19 = _p18._0;return Form_elm_builtin(_U.update(_p19,{scale: _p19.scale * s}));});
   var rotate = F2(function (t,_p20) {    var _p21 = _p20;var _p22 = _p21._0;return Form_elm_builtin(_U.update(_p22,{theta: _p22.theta + t}));});
   var alpha = F2(function (a,_p23) {    var _p24 = _p23;return Form_elm_builtin(_U.update(_p24._0,{alpha: a}));});
   return _elm.Graphics.Collage.values = {_op: _op
                                         ,collage: collage
                                         ,toForm: toForm
                                         ,filled: filled
                                         ,textured: textured
                                         ,gradient: gradient
                                         ,outlined: outlined
                                         ,traced: traced
                                         ,text: text
                                         ,outlinedText: outlinedText
                                         ,move: move
                                         ,moveX: moveX
                                         ,moveY: moveY
                                         ,scale: scale
                                         ,rotate: rotate
                                         ,alpha: alpha
                                         ,group: group
                                         ,groupTransform: groupTransform
                                         ,rect: rect
                                         ,oval: oval
                                         ,square: square
                                         ,circle: circle
                                         ,ngon: ngon
                                         ,polygon: polygon
                                         ,segment: segment
                                         ,path: path
                                         ,solid: solid
                                         ,dashed: dashed
                                         ,dotted: dotted
                                         ,defaultLine: defaultLine
                                         ,LineStyle: LineStyle
                                         ,Flat: Flat
                                         ,Round: Round
                                         ,Padded: Padded
                                         ,Smooth: Smooth
                                         ,Sharp: Sharp
                                         ,Clipped: Clipped};
};
Elm.Native.Debug = {};
Elm.Native.Debug.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Debug = localRuntime.Native.Debug || {};
	if (localRuntime.Native.Debug.values)
	{
		return localRuntime.Native.Debug.values;
	}

	var toString = Elm.Native.Utils.make(localRuntime).toString;

	function log(tag, value)
	{
		var msg = tag + ': ' + toString(value);
		var process = process || {};
		if (process.stdout)
		{
			process.stdout.write(msg);
		}
		else
		{
			console.log(msg);
		}
		return value;
	}

	function crash(message)
	{
		throw new Error(message);
	}

	function tracePath(tag, form)
	{
		if (localRuntime.debug)
		{
			return localRuntime.debug.trace(tag, form);
		}
		return form;
	}

	function watch(tag, value)
	{
		if (localRuntime.debug)
		{
			localRuntime.debug.watch(tag, value);
		}
		return value;
	}

	function watchSummary(tag, summarize, value)
	{
		if (localRuntime.debug)
		{
			localRuntime.debug.watch(tag, summarize(value));
		}
		return value;
	}

	return localRuntime.Native.Debug.values = {
		crash: crash,
		tracePath: F2(tracePath),
		log: F2(log),
		watch: F2(watch),
		watchSummary: F3(watchSummary)
	};
};

Elm.Debug = Elm.Debug || {};
Elm.Debug.make = function (_elm) {
   "use strict";
   _elm.Debug = _elm.Debug || {};
   if (_elm.Debug.values) return _elm.Debug.values;
   var _U = Elm.Native.Utils.make(_elm),$Graphics$Collage = Elm.Graphics.Collage.make(_elm),$Native$Debug = Elm.Native.Debug.make(_elm);
   var _op = {};
   var trace = $Native$Debug.tracePath;
   var watchSummary = $Native$Debug.watchSummary;
   var watch = $Native$Debug.watch;
   var crash = $Native$Debug.crash;
   var log = $Native$Debug.log;
   return _elm.Debug.values = {_op: _op,log: log,crash: crash,watch: watch,watchSummary: watchSummary,trace: trace};
};
Elm.Native.Task = {};

Elm.Native.Task.make = function(localRuntime) {
	localRuntime.Native = localRuntime.Native || {};
	localRuntime.Native.Task = localRuntime.Native.Task || {};
	if (localRuntime.Native.Task.values)
	{
		return localRuntime.Native.Task.values;
	}

	var Result = Elm.Result.make(localRuntime);
	var Signal;
	var Utils = Elm.Native.Utils.make(localRuntime);


	// CONSTRUCTORS

	function succeed(value)
	{
		return {
			tag: 'Succeed',
			value: value
		};
	}

	function fail(error)
	{
		return {
			tag: 'Fail',
			value: error
		};
	}

	function asyncFunction(func)
	{
		return {
			tag: 'Async',
			asyncFunction: func
		};
	}

	function andThen(task, callback)
	{
		return {
			tag: 'AndThen',
			task: task,
			callback: callback
		};
	}

	function catch_(task, callback)
	{
		return {
			tag: 'Catch',
			task: task,
			callback: callback
		};
	}


	// RUNNER

	function perform(task) {
		runTask({ task: task }, function() {});
	}

	function performSignal(name, signal)
	{
		var workQueue = [];

		function onComplete()
		{
			workQueue.shift();

			if (workQueue.length > 0)
			{
				var task = workQueue[0];

				setTimeout(function() {
					runTask(task, onComplete);
				}, 0);
			}
		}

		function register(task)
		{
			var root = { task: task };
			workQueue.push(root);
			if (workQueue.length === 1)
			{
				runTask(root, onComplete);
			}
		}

		if (!Signal)
		{
			Signal = Elm.Native.Signal.make(localRuntime);
		}
		Signal.output('perform-tasks-' + name, register, signal);

		register(signal.value);

		return signal;
	}

	function mark(status, task)
	{
		return { status: status, task: task };
	}

	function runTask(root, onComplete)
	{
		var result = mark('runnable', root.task);
		while (result.status === 'runnable')
		{
			result = stepTask(onComplete, root, result.task);
		}

		if (result.status === 'done')
		{
			root.task = result.task;
			onComplete();
		}

		if (result.status === 'blocked')
		{
			root.task = result.task;
		}
	}

	function stepTask(onComplete, root, task)
	{
		var tag = task.tag;

		if (tag === 'Succeed' || tag === 'Fail')
		{
			return mark('done', task);
		}

		if (tag === 'Async')
		{
			var placeHolder = {};
			var couldBeSync = true;
			var wasSync = false;

			task.asyncFunction(function(result) {
				placeHolder.tag = result.tag;
				placeHolder.value = result.value;
				if (couldBeSync)
				{
					wasSync = true;
				}
				else
				{
					runTask(root, onComplete);
				}
			});
			couldBeSync = false;
			return mark(wasSync ? 'done' : 'blocked', placeHolder);
		}

		if (tag === 'AndThen' || tag === 'Catch')
		{
			var result = mark('runnable', task.task);
			while (result.status === 'runnable')
			{
				result = stepTask(onComplete, root, result.task);
			}

			if (result.status === 'done')
			{
				var activeTask = result.task;
				var activeTag = activeTask.tag;

				var succeedChain = activeTag === 'Succeed' && tag === 'AndThen';
				var failChain = activeTag === 'Fail' && tag === 'Catch';

				return (succeedChain || failChain)
					? mark('runnable', task.callback(activeTask.value))
					: mark('runnable', activeTask);
			}
			if (result.status === 'blocked')
			{
				return mark('blocked', {
					tag: tag,
					task: result.task,
					callback: task.callback
				});
			}
		}
	}


	// THREADS

	function sleep(time) {
		return asyncFunction(function(callback) {
			setTimeout(function() {
				callback(succeed(Utils.Tuple0));
			}, time);
		});
	}

	function spawn(task) {
		return asyncFunction(function(callback) {
			var id = setTimeout(function() {
				perform(task);
			}, 0);
			callback(succeed(id));
		});
	}


	return localRuntime.Native.Task.values = {
		succeed: succeed,
		fail: fail,
		asyncFunction: asyncFunction,
		andThen: F2(andThen),
		catch_: F2(catch_),
		perform: perform,
		performSignal: performSignal,
		spawn: spawn,
		sleep: sleep
	};
};

Elm.Result = Elm.Result || {};
Elm.Result.make = function (_elm) {
   "use strict";
   _elm.Result = _elm.Result || {};
   if (_elm.Result.values) return _elm.Result.values;
   var _U = Elm.Native.Utils.make(_elm),$Maybe = Elm.Maybe.make(_elm);
   var _op = {};
   var toMaybe = function (result) {    var _p0 = result;if (_p0.ctor === "Ok") {    return $Maybe.Just(_p0._0);} else {    return $Maybe.Nothing;}};
   var withDefault = F2(function (def,result) {    var _p1 = result;if (_p1.ctor === "Ok") {    return _p1._0;} else {    return def;}});
   var Err = function (a) {    return {ctor: "Err",_0: a};};
   var andThen = F2(function (result,callback) {    var _p2 = result;if (_p2.ctor === "Ok") {    return callback(_p2._0);} else {    return Err(_p2._0);}});
   var Ok = function (a) {    return {ctor: "Ok",_0: a};};
   var map = F2(function (func,ra) {    var _p3 = ra;if (_p3.ctor === "Ok") {    return Ok(func(_p3._0));} else {    return Err(_p3._0);}});
   var map2 = F3(function (func,ra,rb) {
      var _p4 = {ctor: "_Tuple2",_0: ra,_1: rb};
      if (_p4._0.ctor === "Ok") {
            if (_p4._1.ctor === "Ok") {
                  return Ok(A2(func,_p4._0._0,_p4._1._0));
               } else {
                  return Err(_p4._1._0);
               }
         } else {
            return Err(_p4._0._0);
         }
   });
   var map3 = F4(function (func,ra,rb,rc) {
      var _p5 = {ctor: "_Tuple3",_0: ra,_1: rb,_2: rc};
      if (_p5._0.ctor === "Ok") {
            if (_p5._1.ctor === "Ok") {
                  if (_p5._2.ctor === "Ok") {
                        return Ok(A3(func,_p5._0._0,_p5._1._0,_p5._2._0));
                     } else {
                        return Err(_p5._2._0);
                     }
               } else {
                  return Err(_p5._1._0);
               }
         } else {
            return Err(_p5._0._0);
         }
   });
   var map4 = F5(function (func,ra,rb,rc,rd) {
      var _p6 = {ctor: "_Tuple4",_0: ra,_1: rb,_2: rc,_3: rd};
      if (_p6._0.ctor === "Ok") {
            if (_p6._1.ctor === "Ok") {
                  if (_p6._2.ctor === "Ok") {
                        if (_p6._3.ctor === "Ok") {
                              return Ok(A4(func,_p6._0._0,_p6._1._0,_p6._2._0,_p6._3._0));
                           } else {
                              return Err(_p6._3._0);
                           }
                     } else {
                        return Err(_p6._2._0);
                     }
               } else {
                  return Err(_p6._1._0);
               }
         } else {
            return Err(_p6._0._0);
         }
   });
   var map5 = F6(function (func,ra,rb,rc,rd,re) {
      var _p7 = {ctor: "_Tuple5",_0: ra,_1: rb,_2: rc,_3: rd,_4: re};
      if (_p7._0.ctor === "Ok") {
            if (_p7._1.ctor === "Ok") {
                  if (_p7._2.ctor === "Ok") {
                        if (_p7._3.ctor === "Ok") {
                              if (_p7._4.ctor === "Ok") {
                                    return Ok(A5(func,_p7._0._0,_p7._1._0,_p7._2._0,_p7._3._0,_p7._4._0));
                                 } else {
                                    return Err(_p7._4._0);
                                 }
                           } else {
                              return Err(_p7._3._0);
                           }
                     } else {
                        return Err(_p7._2._0);
                     }
               } else {
                  return Err(_p7._1._0);
               }
         } else {
            return Err(_p7._0._0);
         }
   });
   var formatError = F2(function (f,result) {    var _p8 = result;if (_p8.ctor === "Ok") {    return Ok(_p8._0);} else {    return Err(f(_p8._0));}});
   var fromMaybe = F2(function (err,maybe) {    var _p9 = maybe;if (_p9.ctor === "Just") {    return Ok(_p9._0);} else {    return Err(err);}});
   return _elm.Result.values = {_op: _op
                               ,withDefault: withDefault
                               ,map: map
                               ,map2: map2
                               ,map3: map3
                               ,map4: map4
                               ,map5: map5
                               ,andThen: andThen
                               ,toMaybe: toMaybe
                               ,fromMaybe: fromMaybe
                               ,formatError: formatError
                               ,Ok: Ok
                               ,Err: Err};
};
Elm.Task = Elm.Task || {};
Elm.Task.make = function (_elm) {
   "use strict";
   _elm.Task = _elm.Task || {};
   if (_elm.Task.values) return _elm.Task.values;
   var _U = Elm.Native.Utils.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Task = Elm.Native.Task.make(_elm),
   $Result = Elm.Result.make(_elm);
   var _op = {};
   var sleep = $Native$Task.sleep;
   var spawn = $Native$Task.spawn;
   var ThreadID = function (a) {    return {ctor: "ThreadID",_0: a};};
   var onError = $Native$Task.catch_;
   var andThen = $Native$Task.andThen;
   var fail = $Native$Task.fail;
   var mapError = F2(function (f,task) {    return A2(onError,task,function (err) {    return fail(f(err));});});
   var succeed = $Native$Task.succeed;
   var map = F2(function (func,taskA) {    return A2(andThen,taskA,function (a) {    return succeed(func(a));});});
   var map2 = F3(function (func,taskA,taskB) {
      return A2(andThen,taskA,function (a) {    return A2(andThen,taskB,function (b) {    return succeed(A2(func,a,b));});});
   });
   var map3 = F4(function (func,taskA,taskB,taskC) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,taskB,function (b) {    return A2(andThen,taskC,function (c) {    return succeed(A3(func,a,b,c));});});
      });
   });
   var map4 = F5(function (func,taskA,taskB,taskC,taskD) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,
         taskB,
         function (b) {
            return A2(andThen,taskC,function (c) {    return A2(andThen,taskD,function (d) {    return succeed(A4(func,a,b,c,d));});});
         });
      });
   });
   var map5 = F6(function (func,taskA,taskB,taskC,taskD,taskE) {
      return A2(andThen,
      taskA,
      function (a) {
         return A2(andThen,
         taskB,
         function (b) {
            return A2(andThen,
            taskC,
            function (c) {
               return A2(andThen,taskD,function (d) {    return A2(andThen,taskE,function (e) {    return succeed(A5(func,a,b,c,d,e));});});
            });
         });
      });
   });
   var andMap = F2(function (taskFunc,taskValue) {
      return A2(andThen,taskFunc,function (func) {    return A2(andThen,taskValue,function (value) {    return succeed(func(value));});});
   });
   var sequence = function (tasks) {
      var _p0 = tasks;
      if (_p0.ctor === "[]") {
            return succeed(_U.list([]));
         } else {
            return A3(map2,F2(function (x,y) {    return A2($List._op["::"],x,y);}),_p0._0,sequence(_p0._1));
         }
   };
   var toMaybe = function (task) {    return A2(onError,A2(map,$Maybe.Just,task),function (_p1) {    return succeed($Maybe.Nothing);});};
   var fromMaybe = F2(function ($default,maybe) {    var _p2 = maybe;if (_p2.ctor === "Just") {    return succeed(_p2._0);} else {    return fail($default);}});
   var toResult = function (task) {    return A2(onError,A2(map,$Result.Ok,task),function (msg) {    return succeed($Result.Err(msg));});};
   var fromResult = function (result) {    var _p3 = result;if (_p3.ctor === "Ok") {    return succeed(_p3._0);} else {    return fail(_p3._0);}};
   var Task = {ctor: "Task"};
   return _elm.Task.values = {_op: _op
                             ,succeed: succeed
                             ,fail: fail
                             ,map: map
                             ,map2: map2
                             ,map3: map3
                             ,map4: map4
                             ,map5: map5
                             ,andMap: andMap
                             ,sequence: sequence
                             ,andThen: andThen
                             ,onError: onError
                             ,mapError: mapError
                             ,toMaybe: toMaybe
                             ,fromMaybe: fromMaybe
                             ,toResult: toResult
                             ,fromResult: fromResult
                             ,spawn: spawn
                             ,sleep: sleep};
};
Elm.Signal = Elm.Signal || {};
Elm.Signal.make = function (_elm) {
   "use strict";
   _elm.Signal = _elm.Signal || {};
   if (_elm.Signal.values) return _elm.Signal.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$Signal = Elm.Native.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var send = F2(function (_p0,value) {
      var _p1 = _p0;
      return A2($Task.onError,_p1._0(value),function (_p2) {    return $Task.succeed({ctor: "_Tuple0"});});
   });
   var Message = function (a) {    return {ctor: "Message",_0: a};};
   var message = F2(function (_p3,value) {    var _p4 = _p3;return Message(_p4._0(value));});
   var mailbox = $Native$Signal.mailbox;
   var Address = function (a) {    return {ctor: "Address",_0: a};};
   var forwardTo = F2(function (_p5,f) {    var _p6 = _p5;return Address(function (x) {    return _p6._0(f(x));});});
   var Mailbox = F2(function (a,b) {    return {address: a,signal: b};});
   var sampleOn = $Native$Signal.sampleOn;
   var dropRepeats = $Native$Signal.dropRepeats;
   var filterMap = $Native$Signal.filterMap;
   var filter = F3(function (isOk,base,signal) {
      return A3(filterMap,function (value) {    return isOk(value) ? $Maybe.Just(value) : $Maybe.Nothing;},base,signal);
   });
   var merge = F2(function (left,right) {    return A3($Native$Signal.genericMerge,$Basics.always,left,right);});
   var mergeMany = function (signalList) {
      var _p7 = $List.reverse(signalList);
      if (_p7.ctor === "[]") {
            return _U.crashCase("Signal",{start: {line: 184,column: 3},end: {line: 189,column: 40}},_p7)("mergeMany was given an empty list!");
         } else {
            return A3($List.foldl,merge,_p7._0,_p7._1);
         }
   };
   var foldp = $Native$Signal.foldp;
   var map5 = $Native$Signal.map5;
   var map4 = $Native$Signal.map4;
   var map3 = $Native$Signal.map3;
   var map2 = $Native$Signal.map2;
   var map = $Native$Signal.map;
   var constant = $Native$Signal.constant;
   var Signal = {ctor: "Signal"};
   return _elm.Signal.values = {_op: _op
                               ,merge: merge
                               ,mergeMany: mergeMany
                               ,map: map
                               ,map2: map2
                               ,map3: map3
                               ,map4: map4
                               ,map5: map5
                               ,constant: constant
                               ,dropRepeats: dropRepeats
                               ,filter: filter
                               ,filterMap: filterMap
                               ,sampleOn: sampleOn
                               ,foldp: foldp
                               ,mailbox: mailbox
                               ,send: send
                               ,message: message
                               ,forwardTo: forwardTo
                               ,Mailbox: Mailbox};
};
Elm.Native.PeerClient = {};

Elm.Native.PeerClient.make = function(localRuntime) {

  var connections = {};
  var receive_address;
  var server_address;

  localRuntime.Native = localRuntime.Native || {};
  localRuntime.Native.PeerClient = localRuntime.Native.PeerClient || {};
  
  if (localRuntime.Native.PeerClient.values) {
    return localRuntime.Native.PeerClient.values;
  }

  var Signal = Elm.Native.Signal.make(localRuntime);
  var Task = Elm.Native.Task.make(localRuntime);
  var Utils = Elm.Native.Utils.make(localRuntime);


  function makePeer(serverkey) {
    var peer;
    return Task.asyncFunction(function(callback) {

        //peer = peer || new Peer({key: serverkey});
        peer = peer || new Peer("coolpeer", {host: "localhost", path: '/peerapp', debug: 2});
        
        peer.on('connection', function(conn) {
          console.log("1 got a connection from", conn);
          open_connection(conn.peer, conn);
        });

        if (peer.disconnected) {
            
            peer.reconnect();
        }
        callback(Task.succeed(peer));
        
    });
  }

  function serverUpdates(signal_address, peer) {
      return Task.asyncFunction(function(callback){
        server_address = signal_address;
          peer.on('open', function(id) {
            console.log("My peer ID is: " + id);
            if (typeof id !== "string") {id = JSON.stringify(id)|| "null";}
            Task.perform(signal_address._0(id));
            // this is how we send back new values to the Mailbox!!
        });
          callback(Task.succeed(Utils.Tuple0));
          // this is what we call to "end" this function call, sending back ()
      });
  } 

  function receive(signal_address, peer) {
    return Task.asyncFunction(function(callback){

      /* save the address of the mailbox where we can send back stuff!*/
      receive_address = signal_address;
      callback(Task.succeed(Utils.Tuple0));
    });
  }

  function emit(peer_message, peer) {
    return Task.asyncFunction(function(callback) {
      if (peer_message.ctor === "IntroPeer") {
        add_peer(peer_message);
      }
      else if (peer_message.ctor === "Message") {

      }
      callback(Task.succeed(Utils.Tuple0));
    });
  }


  /* H E L P E R   F U N C S */

  function open_connection(fellow_peer_id, conn) {
    //console.log("opening a connection with: ", fellow_peer_id, " -- ", conn);
    Task.perform(server_address._0(fellow_peer_id));


    /* save the connection so we can send stuff back */
    connections[fellow_peer_id] = conn;
    conn.on('data', function(data) {
      console.log('Received, from: ', fellow_peer_id, " -- ", data);
      receive_data(fellow_peer_id, data);
    });
  }


  function receive_data(fellow_peer_id, data) {
    if (data.ctor === "IntroPeer") {
      add_peer(peer_message);
    }
    Task.perform(receive_address._0(data));
  }


  function add_peer(peer_message) {

    var fellow_peer_id = peer_message._0;
    /* open a connection to this peer */
    var conn = peer.connect(fellow_peer_id);
      
    conn.on('open', function(){
      open_connection(fellow_peer_id, conn);
    });
  }





    // when you get an ADD PEER update:
    // var conn = peer.connect('PEER ID!!!');// SAVE THIS!!!!!
    // conn.on('open,' function()) {
    // I think I need to call receive and put the 
    // OR I DEFINE A NEW FUNCTION IS THE GET STUFF BACK FUNCTION
    // AND I CALL IT?
    // I NEED TO MAKE IT THAT THE SINGLE call to receive makes sure that ALL
    // connections' data.on goes back as an asnwer to that response.


    //
    //
    //



localRuntime.Native.PeerClient.values = {
  makePeer: makePeer,
  serverUpdates: F2(serverUpdates),
  receive: F2(receive)
}

return localRuntime.Native.PeerClient.values;
}




/*! peerjs build:0.3.13, production. Copyright(c) 2013 Michelle Bu <michelle@michellebu.com> */
!function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);var j=new Error("Cannot find module '"+g+"'");throw j.code="MODULE_NOT_FOUND",j}var k=c[g]={exports:{}};b[g][0].call(k.exports,function(a){var c=b[g][1][a];return e(c?c:a)},k,k.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b){b.exports.RTCSessionDescription=window.RTCSessionDescription||window.mozRTCSessionDescription,b.exports.RTCPeerConnection=window.RTCPeerConnection||window.mozRTCPeerConnection||window.webkitRTCPeerConnection,b.exports.RTCIceCandidate=window.RTCIceCandidate||window.mozRTCIceCandidate},{}],2:[function(a,b){function c(a,b,g){return this instanceof c?(e.call(this),this.options=d.extend({serialization:"binary",reliable:!1},g),this.open=!1,this.type="data",this.peer=a,this.provider=b,this.id=this.options.connectionId||c._idPrefix+d.randomToken(),this.label=this.options.label||this.id,this.metadata=this.options.metadata,this.serialization=this.options.serialization,this.reliable=this.options.reliable,this._buffer=[],this._buffering=!1,this.bufferSize=0,this._chunkedData={},this.options._payload&&(this._peerBrowser=this.options._payload.browser),void f.startConnection(this,this.options._payload||{originator:!0})):new c(a,b,g)}var d=a("./util"),e=a("eventemitter3"),f=a("./negotiator"),g=a("reliable");d.inherits(c,e),c._idPrefix="dc_",c.prototype.initialize=function(a){this._dc=this.dataChannel=a,this._configureDataChannel()},c.prototype._configureDataChannel=function(){var a=this;d.supports.sctp&&(this._dc.binaryType="arraybuffer"),this._dc.onopen=function(){d.log("Data channel connection success"),a.open=!0,a.emit("open")},!d.supports.sctp&&this.reliable&&(this._reliable=new g(this._dc,d.debug)),this._reliable?this._reliable.onmessage=function(b){a.emit("data",b)}:this._dc.onmessage=function(b){a._handleDataMessage(b)},this._dc.onclose=function(){d.log("DataChannel closed for:",a.peer),a.close()}},c.prototype._handleDataMessage=function(a){var b=this,c=a.data,e=c.constructor;if("binary"===this.serialization||"binary-utf8"===this.serialization){if(e===Blob)return void d.blobToArrayBuffer(c,function(a){c=d.unpack(a),b.emit("data",c)});if(e===ArrayBuffer)c=d.unpack(c);else if(e===String){var f=d.binaryStringToArrayBuffer(c);c=d.unpack(f)}}else"json"===this.serialization&&(c=JSON.parse(c));if(c.__peerData){var g=c.__peerData,h=this._chunkedData[g]||{data:[],count:0,total:c.total};return h.data[c.n]=c.data,h.count+=1,h.total===h.count&&(delete this._chunkedData[g],c=new Blob(h.data),this._handleDataMessage({data:c})),void(this._chunkedData[g]=h)}this.emit("data",c)},c.prototype.close=function(){this.open&&(this.open=!1,f.cleanup(this),this.emit("close"))},c.prototype.send=function(a,b){if(!this.open)return void this.emit("error",new Error("Connection is not open. You should listen for the `open` event before sending messages."));if(this._reliable)return void this._reliable.send(a);var c=this;if("json"===this.serialization)this._bufferedSend(JSON.stringify(a));else if("binary"===this.serialization||"binary-utf8"===this.serialization){var e=d.pack(a),f=d.chunkedBrowsers[this._peerBrowser]||d.chunkedBrowsers[d.browser];if(f&&!b&&e.size>d.chunkedMTU)return void this._sendChunks(e);d.supports.sctp?d.supports.binaryBlob?this._bufferedSend(e):d.blobToArrayBuffer(e,function(a){c._bufferedSend(a)}):d.blobToBinaryString(e,function(a){c._bufferedSend(a)})}else this._bufferedSend(a)},c.prototype._bufferedSend=function(a){(this._buffering||!this._trySend(a))&&(this._buffer.push(a),this.bufferSize=this._buffer.length)},c.prototype._trySend=function(a){try{this._dc.send(a)}catch(b){this._buffering=!0;var c=this;return setTimeout(function(){c._buffering=!1,c._tryBuffer()},100),!1}return!0},c.prototype._tryBuffer=function(){if(0!==this._buffer.length){var a=this._buffer[0];this._trySend(a)&&(this._buffer.shift(),this.bufferSize=this._buffer.length,this._tryBuffer())}},c.prototype._sendChunks=function(a){for(var b=d.chunk(a),c=0,e=b.length;e>c;c+=1){var a=b[c];this.send(a,!0)}},c.prototype.handleMessage=function(a){var b=a.payload;switch(a.type){case"ANSWER":this._peerBrowser=b.browser,f.handleSDP(a.type,this,b.sdp);break;case"CANDIDATE":f.handleCandidate(this,b.candidate);break;default:d.warn("Unrecognized message type:",a.type,"from peer:",this.peer)}},b.exports=c},{"./negotiator":5,"./util":8,eventemitter3:9,reliable:12}],3:[function(a){window.Socket=a("./socket"),window.MediaConnection=a("./mediaconnection"),window.DataConnection=a("./dataconnection"),window.Peer=a("./peer"),window.RTCPeerConnection=a("./adapter").RTCPeerConnection,window.RTCSessionDescription=a("./adapter").RTCSessionDescription,window.RTCIceCandidate=a("./adapter").RTCIceCandidate,window.Negotiator=a("./negotiator"),window.util=a("./util"),window.BinaryPack=a("js-binarypack")},{"./adapter":1,"./dataconnection":2,"./mediaconnection":4,"./negotiator":5,"./peer":6,"./socket":7,"./util":8,"js-binarypack":10}],4:[function(a,b){function c(a,b,g){return this instanceof c?(e.call(this),this.options=d.extend({},g),this.open=!1,this.type="media",this.peer=a,this.provider=b,this.metadata=this.options.metadata,this.localStream=this.options._stream,this.id=this.options.connectionId||c._idPrefix+d.randomToken(),void(this.localStream&&f.startConnection(this,{_stream:this.localStream,originator:!0}))):new c(a,b,g)}var d=a("./util"),e=a("eventemitter3"),f=a("./negotiator");d.inherits(c,e),c._idPrefix="mc_",c.prototype.addStream=function(a){d.log("Receiving stream",a),this.remoteStream=a,this.emit("stream",a)},c.prototype.handleMessage=function(a){var b=a.payload;switch(a.type){case"ANSWER":f.handleSDP(a.type,this,b.sdp),this.open=!0;break;case"CANDIDATE":f.handleCandidate(this,b.candidate);break;default:d.warn("Unrecognized message type:",a.type,"from peer:",this.peer)}},c.prototype.answer=function(a){if(this.localStream)return void d.warn("Local stream already exists on this MediaConnection. Are you answering a call twice?");this.options._payload._stream=a,this.localStream=a,f.startConnection(this,this.options._payload);for(var b=this.provider._getMessages(this.id),c=0,e=b.length;e>c;c+=1)this.handleMessage(b[c]);this.open=!0},c.prototype.close=function(){this.open&&(this.open=!1,f.cleanup(this),this.emit("close"))},b.exports=c},{"./negotiator":5,"./util":8,eventemitter3:9}],5:[function(a,b){var c=a("./util"),d=a("./adapter").RTCPeerConnection,e=a("./adapter").RTCSessionDescription,f=a("./adapter").RTCIceCandidate,g={pcs:{data:{},media:{}},queue:[]};g._idPrefix="pc_",g.startConnection=function(a,b){var d=g._getPeerConnection(a,b);if("media"===a.type&&b._stream&&d.addStream(b._stream),a.pc=a.peerConnection=d,b.originator){if("data"===a.type){var e={};c.supports.sctp||(e={reliable:b.reliable});var f=d.createDataChannel(a.label,e);a.initialize(f)}c.supports.onnegotiationneeded||g._makeOffer(a)}else g.handleSDP("OFFER",a,b.sdp)},g._getPeerConnection=function(a,b){g.pcs[a.type]||c.error(a.type+" is not a valid connection type. Maybe you overrode the `type` property somewhere."),g.pcs[a.type][a.peer]||(g.pcs[a.type][a.peer]={});{var d;g.pcs[a.type][a.peer]}return b.pc&&(d=g.pcs[a.type][a.peer][b.pc]),d&&"stable"===d.signalingState||(d=g._startPeerConnection(a)),d},g._startPeerConnection=function(a){c.log("Creating RTCPeerConnection.");var b=g._idPrefix+c.randomToken(),e={};"data"!==a.type||c.supports.sctp?"media"===a.type&&(e={optional:[{DtlsSrtpKeyAgreement:!0}]}):e={optional:[{RtpDataChannels:!0}]};var f=new d(a.provider.options.config,e);return g.pcs[a.type][a.peer][b]=f,g._setupListeners(a,f,b),f},g._setupListeners=function(a,b){var d=a.peer,e=a.id,f=a.provider;c.log("Listening for ICE candidates."),b.onicecandidate=function(b){b.candidate&&(c.log("Received ICE candidates for:",a.peer),f.socket.send({type:"CANDIDATE",payload:{candidate:b.candidate,type:a.type,connectionId:a.id},dst:d}))},b.oniceconnectionstatechange=function(){switch(b.iceConnectionState){case"disconnected":case"failed":c.log("iceConnectionState is disconnected, closing connections to "+d),a.close();break;case"completed":b.onicecandidate=c.noop}},b.onicechange=b.oniceconnectionstatechange,c.log("Listening for `negotiationneeded`"),b.onnegotiationneeded=function(){c.log("`negotiationneeded` triggered"),"stable"==b.signalingState?g._makeOffer(a):c.log("onnegotiationneeded triggered when not stable. Is another connection being established?")},c.log("Listening for data channel"),b.ondatachannel=function(a){c.log("Received data channel");var b=a.channel,g=f.getConnection(d,e);g.initialize(b)},c.log("Listening for remote stream"),b.onaddstream=function(a){c.log("Received remote stream");var b=a.stream,g=f.getConnection(d,e);"media"===g.type&&g.addStream(b)}},g.cleanup=function(a){c.log("Cleaning up PeerConnection to "+a.peer);var b=a.pc;!b||"closed"===b.readyState&&"closed"===b.signalingState||(b.close(),a.pc=null)},g._makeOffer=function(a){var b=a.pc;b.createOffer(function(d){c.log("Created offer."),!c.supports.sctp&&"data"===a.type&&a.reliable&&(d.sdp=Reliable.higherBandwidthSDP(d.sdp)),b.setLocalDescription(d,function(){c.log("Set localDescription: offer","for:",a.peer),a.provider.socket.send({type:"OFFER",payload:{sdp:d,type:a.type,label:a.label,connectionId:a.id,reliable:a.reliable,serialization:a.serialization,metadata:a.metadata,browser:c.browser},dst:a.peer})},function(b){a.provider.emitError("webrtc",b),c.log("Failed to setLocalDescription, ",b)})},function(b){a.provider.emitError("webrtc",b),c.log("Failed to createOffer, ",b)},a.options.constraints)},g._makeAnswer=function(a){var b=a.pc;b.createAnswer(function(d){c.log("Created answer."),!c.supports.sctp&&"data"===a.type&&a.reliable&&(d.sdp=Reliable.higherBandwidthSDP(d.sdp)),b.setLocalDescription(d,function(){c.log("Set localDescription: answer","for:",a.peer),a.provider.socket.send({type:"ANSWER",payload:{sdp:d,type:a.type,connectionId:a.id,browser:c.browser},dst:a.peer})},function(b){a.provider.emitError("webrtc",b),c.log("Failed to setLocalDescription, ",b)})},function(b){a.provider.emitError("webrtc",b),c.log("Failed to create answer, ",b)})},g.handleSDP=function(a,b,d){d=new e(d);var f=b.pc;c.log("Setting remote description",d),f.setRemoteDescription(d,function(){c.log("Set remoteDescription:",a,"for:",b.peer),"OFFER"===a&&g._makeAnswer(b)},function(a){b.provider.emitError("webrtc",a),c.log("Failed to setRemoteDescription, ",a)})},g.handleCandidate=function(a,b){var d=b.candidate,e=b.sdpMLineIndex;a.pc.addIceCandidate(new f({sdpMLineIndex:e,candidate:d})),c.log("Added ICE candidate for:",a.peer)},b.exports=g},{"./adapter":1,"./util":8}],6:[function(a,b){function c(a,b){return this instanceof c?(e.call(this),a&&a.constructor==Object?(b=a,a=void 0):a&&(a=a.toString()),b=d.extend({debug:0,host:d.CLOUD_HOST,port:d.CLOUD_PORT,key:"peerjs",path:"/",token:d.randomToken(),config:d.defaultConfig},b),this.options=b,"/"===b.host&&(b.host=window.location.hostname),"/"!==b.path[0]&&(b.path="/"+b.path),"/"!==b.path[b.path.length-1]&&(b.path+="/"),void 0===b.secure&&b.host!==d.CLOUD_HOST&&(b.secure=d.isSecure()),b.logFunction&&d.setLogFunction(b.logFunction),d.setLogLevel(b.debug),d.supports.audioVideo||d.supports.data?d.validateId(a)?d.validateKey(b.key)?b.secure&&"0.peerjs.com"===b.host?void this._delayedAbort("ssl-unavailable","The cloud server currently does not support HTTPS. Please run your own PeerServer to use HTTPS."):(this.destroyed=!1,this.disconnected=!1,this.open=!1,this.connections={},this._lostMessages={},this._initializeServerConnection(),void(a?this._initialize(a):this._retrieveId())):void this._delayedAbort("invalid-key",'API KEY "'+b.key+'" is invalid'):void this._delayedAbort("invalid-id",'ID "'+a+'" is invalid'):void this._delayedAbort("browser-incompatible","The current browser does not support WebRTC")):new c(a,b)}var d=a("./util"),e=a("eventemitter3"),f=a("./socket"),g=a("./mediaconnection"),h=a("./dataconnection");d.inherits(c,e),c.prototype._initializeServerConnection=function(){var a=this;this.socket=new f(this.options.secure,this.options.host,this.options.port,this.options.path,this.options.key),this.socket.on("message",function(b){a._handleMessage(b)}),this.socket.on("error",function(b){a._abort("socket-error",b)}),this.socket.on("disconnected",function(){a.disconnected||(a.emitError("network","Lost connection to server."),a.disconnect())}),this.socket.on("close",function(){a.disconnected||a._abort("socket-closed","Underlying socket is already closed.")})},c.prototype._retrieveId=function(){var a=this,b=new XMLHttpRequest,c=this.options.secure?"https://":"http://",e=c+this.options.host+":"+this.options.port+this.options.path+this.options.key+"/id",f="?ts="+(new Date).getTime()+Math.random();e+=f,b.open("get",e,!0),b.onerror=function(b){d.error("Error retrieving ID",b);var c="";"/"===a.options.path&&a.options.host!==d.CLOUD_HOST&&(c=" If you passed in a `path` to your self-hosted PeerServer, you'll also need to pass in that same path when creating a new Peer."),a._abort("server-error","Could not get an ID from the server."+c)},b.onreadystatechange=function(){return 4===b.readyState?200!==b.status?void b.onerror():void a._initialize(b.responseText):void 0},b.send(null)},c.prototype._initialize=function(a){this.id=a,this.socket.start(this.id,this.options.token)},c.prototype._handleMessage=function(a){var b,c=a.type,e=a.payload,f=a.src;switch(c){case"OPEN":this.emit("open",this.id),this.open=!0;break;case"ERROR":this._abort("server-error",e.msg);break;case"ID-TAKEN":this._abort("unavailable-id","ID `"+this.id+"` is taken");break;case"INVALID-KEY":this._abort("invalid-key",'API KEY "'+this.options.key+'" is invalid');break;case"LEAVE":d.log("Received leave message from",f),this._cleanupPeer(f);break;case"EXPIRE":this.emitError("peer-unavailable","Could not connect to peer "+f);break;case"OFFER":var i=e.connectionId;if(b=this.getConnection(f,i))d.warn("Offer received for existing Connection ID:",i);else{if("media"===e.type)b=new g(f,this,{connectionId:i,_payload:e,metadata:e.metadata}),this._addConnection(f,b),this.emit("call",b);else{if("data"!==e.type)return void d.warn("Received malformed connection type:",e.type);b=new h(f,this,{connectionId:i,_payload:e,metadata:e.metadata,label:e.label,serialization:e.serialization,reliable:e.reliable}),this._addConnection(f,b),this.emit("connection",b)}for(var j=this._getMessages(i),k=0,l=j.length;l>k;k+=1)b.handleMessage(j[k])}break;default:if(!e)return void d.warn("You received a malformed message from "+f+" of type "+c);var m=e.connectionId;b=this.getConnection(f,m),b&&b.pc?b.handleMessage(a):m?this._storeMessage(m,a):d.warn("You received an unrecognized message:",a)}},c.prototype._storeMessage=function(a,b){this._lostMessages[a]||(this._lostMessages[a]=[]),this._lostMessages[a].push(b)},c.prototype._getMessages=function(a){var b=this._lostMessages[a];return b?(delete this._lostMessages[a],b):[]},c.prototype.connect=function(a,b){if(this.disconnected)return d.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect, or call reconnect on this peer if you believe its ID to still be available."),void this.emitError("disconnected","Cannot connect to new Peer after disconnecting from server.");var c=new h(a,this,b);return this._addConnection(a,c),c},c.prototype.call=function(a,b,c){if(this.disconnected)return d.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect."),void this.emitError("disconnected","Cannot connect to new Peer after disconnecting from server.");if(!b)return void d.error("To call a peer, you must provide a stream from your browser's `getUserMedia`.");c=c||{},c._stream=b;var e=new g(a,this,c);return this._addConnection(a,e),e},c.prototype._addConnection=function(a,b){this.connections[a]||(this.connections[a]=[]),this.connections[a].push(b)},c.prototype.getConnection=function(a,b){var c=this.connections[a];if(!c)return null;for(var d=0,e=c.length;e>d;d++)if(c[d].id===b)return c[d];return null},c.prototype._delayedAbort=function(a,b){var c=this;d.setZeroTimeout(function(){c._abort(a,b)})},c.prototype._abort=function(a,b){d.error("Aborting!"),this._lastServerId?this.disconnect():this.destroy(),this.emitError(a,b)},c.prototype.emitError=function(a,b){d.error("Error:",b),"string"==typeof b&&(b=new Error(b)),b.type=a,this.emit("error",b)},c.prototype.destroy=function(){this.destroyed||(this._cleanup(),this.disconnect(),this.destroyed=!0)},c.prototype._cleanup=function(){if(this.connections)for(var a=Object.keys(this.connections),b=0,c=a.length;c>b;b++)this._cleanupPeer(a[b]);this.emit("close")},c.prototype._cleanupPeer=function(a){for(var b=this.connections[a],c=0,d=b.length;d>c;c+=1)b[c].close()},c.prototype.disconnect=function(){var a=this;d.setZeroTimeout(function(){a.disconnected||(a.disconnected=!0,a.open=!1,a.socket&&a.socket.close(),a.emit("disconnected",a.id),a._lastServerId=a.id,a.id=null)})},c.prototype.reconnect=function(){if(this.disconnected&&!this.destroyed)d.log("Attempting reconnection to server with ID "+this._lastServerId),this.disconnected=!1,this._initializeServerConnection(),this._initialize(this._lastServerId);else{if(this.destroyed)throw new Error("This peer cannot reconnect to the server. It has already been destroyed.");if(this.disconnected||this.open)throw new Error("Peer "+this.id+" cannot reconnect because it is not disconnected from the server!");d.error("In a hurry? We're still trying to make the initial connection!")}},c.prototype.listAllPeers=function(a){a=a||function(){};var b=this,c=new XMLHttpRequest,e=this.options.secure?"https://":"http://",f=e+this.options.host+":"+this.options.port+this.options.path+this.options.key+"/peers",g="?ts="+(new Date).getTime()+Math.random();f+=g,c.open("get",f,!0),c.onerror=function(){b._abort("server-error","Could not get peers from the server."),a([])},c.onreadystatechange=function(){if(4===c.readyState){if(401===c.status){var e="";throw e=b.options.host!==d.CLOUD_HOST?"It looks like you're using the cloud server. You can email team@peerjs.com to enable peer listing for your API key.":"You need to enable `allow_discovery` on your self-hosted PeerServer to use this feature.",a([]),new Error("It doesn't look like you have permission to list peers IDs. "+e)}a(200!==c.status?[]:JSON.parse(c.responseText))}},c.send(null)},b.exports=c},{"./dataconnection":2,"./mediaconnection":4,"./socket":7,"./util":8,eventemitter3:9}],7:[function(a,b){function c(a,b,d,f,g){if(!(this instanceof c))return new c(a,b,d,f,g);e.call(this),this.disconnected=!1,this._queue=[];var h=a?"https://":"http://",i=a?"wss://":"ws://";this._httpUrl=h+b+":"+d+f+g,this._wsUrl=i+b+":"+d+f+"peerjs?key="+g}var d=a("./util"),e=a("eventemitter3");d.inherits(c,e),c.prototype.start=function(a,b){this.id=a,this._httpUrl+="/"+a+"/"+b,this._wsUrl+="&id="+a+"&token="+b,this._startXhrStream(),this._startWebSocket()},c.prototype._startWebSocket=function(){var a=this;this._socket||(this._socket=new WebSocket(this._wsUrl),this._socket.onmessage=function(b){try{var c=JSON.parse(b.data)}catch(e){return void d.log("Invalid server message",b.data)}a.emit("message",c)},this._socket.onclose=function(){d.log("Socket closed."),a.disconnected=!0,a.emit("disconnected")},this._socket.onopen=function(){a._timeout&&(clearTimeout(a._timeout),setTimeout(function(){a._http.abort(),a._http=null},5e3)),a._sendQueuedMessages(),d.log("Socket open")})},c.prototype._startXhrStream=function(a){try{var b=this;this._http=new XMLHttpRequest,this._http._index=1,this._http._streamIndex=a||0,this._http.open("post",this._httpUrl+"/id?i="+this._http._streamIndex,!0),this._http.onerror=function(){clearTimeout(b._timeout),b.emit("disconnected")},this._http.onreadystatechange=function(){2==this.readyState&&this.old?(this.old.abort(),delete this.old):this.readyState>2&&200===this.status&&this.responseText&&b._handleStream(this)},this._http.send(null),this._setHTTPTimeout()}catch(c){d.log("XMLHttpRequest not available; defaulting to WebSockets")}},c.prototype._handleStream=function(a){var b=a.responseText.split("\n");if(a._buffer)for(;a._buffer.length>0;){var c=a._buffer.shift(),e=b[c];try{e=JSON.parse(e)}catch(f){a._buffer.shift(c);break}this.emit("message",e)}var g=b[a._index];if(g)if(a._index+=1,a._index===b.length)a._buffer||(a._buffer=[]),a._buffer.push(a._index-1);else{try{g=JSON.parse(g)}catch(f){return void d.log("Invalid server message",g)}this.emit("message",g)}},c.prototype._setHTTPTimeout=function(){var a=this;this._timeout=setTimeout(function(){var b=a._http;a._wsOpen()?b.abort():(a._startXhrStream(b._streamIndex+1),a._http.old=b)},25e3)},c.prototype._wsOpen=function(){return this._socket&&1==this._socket.readyState},c.prototype._sendQueuedMessages=function(){for(var a=0,b=this._queue.length;b>a;a+=1)this.send(this._queue[a])},c.prototype.send=function(a){if(!this.disconnected){if(!this.id)return void this._queue.push(a);if(!a.type)return void this.emit("error","Invalid message");var b=JSON.stringify(a);if(this._wsOpen())this._socket.send(b);else{var c=new XMLHttpRequest,d=this._httpUrl+"/"+a.type.toLowerCase();c.open("post",d,!0),c.setRequestHeader("Content-Type","application/json"),c.send(b)}}},c.prototype.close=function(){!this.disconnected&&this._wsOpen()&&(this._socket.close(),this.disconnected=!0)},b.exports=c},{"./util":8,eventemitter3:9}],8:[function(a,b){var c={iceServers:[{url:"stun:stun.l.google.com:19302"}]},d=1,e=a("js-binarypack"),f=a("./adapter").RTCPeerConnection,g={noop:function(){},CLOUD_HOST:"0.peerjs.com",CLOUD_PORT:9e3,chunkedBrowsers:{Chrome:1},chunkedMTU:16300,logLevel:0,setLogLevel:function(a){var b=parseInt(a,10);g.logLevel=isNaN(parseInt(a,10))?a?3:0:b,g.log=g.warn=g.error=g.noop,g.logLevel>0&&(g.error=g._printWith("ERROR")),g.logLevel>1&&(g.warn=g._printWith("WARNING")),g.logLevel>2&&(g.log=g._print)},setLogFunction:function(a){a.constructor!==Function?g.warn("The log function you passed in is not a function. Defaulting to regular logs."):g._print=a},_printWith:function(a){return function(){var b=Array.prototype.slice.call(arguments);b.unshift(a),g._print.apply(g,b)}},_print:function(){var a=!1,b=Array.prototype.slice.call(arguments);b.unshift("PeerJS: ");for(var c=0,d=b.length;d>c;c++)b[c]instanceof Error&&(b[c]="("+b[c].name+") "+b[c].message,a=!0);a?console.error.apply(console,b):console.log.apply(console,b)},defaultConfig:c,browser:function(){return window.mozRTCPeerConnection?"Firefox":window.webkitRTCPeerConnection?"Chrome":window.RTCPeerConnection?"Supported":"Unsupported"}(),supports:function(){if("undefined"==typeof f)return{};var a,b,d=!0,e=!0,h=!1,i=!1,j=!!window.webkitRTCPeerConnection;try{a=new f(c,{optional:[{RtpDataChannels:!0}]})}catch(k){d=!1,e=!1}if(d)try{b=a.createDataChannel("_PEERJSTEST")}catch(k){d=!1}if(d){try{b.binaryType="blob",h=!0}catch(k){}var l=new f(c,{});try{var m=l.createDataChannel("_PEERJSRELIABLETEST",{});i=m.reliable}catch(k){}l.close()}if(e&&(e=!!a.addStream),!j&&d){var n=new f(c,{optional:[{RtpDataChannels:!0}]});n.onnegotiationneeded=function(){j=!0,g&&g.supports&&(g.supports.onnegotiationneeded=!0)},n.createDataChannel("_PEERJSNEGOTIATIONTEST"),setTimeout(function(){n.close()},1e3)}return a&&a.close(),{audioVideo:e,data:d,binaryBlob:h,binary:i,reliable:i,sctp:i,onnegotiationneeded:j}}(),validateId:function(a){return!a||/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(a)},validateKey:function(a){return!a||/^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.exec(a)},debug:!1,inherits:function(a,b){a.super_=b,a.prototype=Object.create(b.prototype,{constructor:{value:a,enumerable:!1,writable:!0,configurable:!0}})},extend:function(a,b){for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c]);return a},pack:e.pack,unpack:e.unpack,log:function(){if(g.debug){var a=!1,b=Array.prototype.slice.call(arguments);b.unshift("PeerJS: ");for(var c=0,d=b.length;d>c;c++)b[c]instanceof Error&&(b[c]="("+b[c].name+") "+b[c].message,a=!0);a?console.error.apply(console,b):console.log.apply(console,b)}},setZeroTimeout:function(a){function b(b){d.push(b),a.postMessage(e,"*")}function c(b){b.source==a&&b.data==e&&(b.stopPropagation&&b.stopPropagation(),d.length&&d.shift()())}var d=[],e="zero-timeout-message";return a.addEventListener?a.addEventListener("message",c,!0):a.attachEvent&&a.attachEvent("onmessage",c),b}(window),chunk:function(a){for(var b=[],c=a.size,e=index=0,f=Math.ceil(c/g.chunkedMTU);c>e;){var h=Math.min(c,e+g.chunkedMTU),i=a.slice(e,h),j={__peerData:d,n:index,data:i,total:f};b.push(j),e=h,index+=1}return d+=1,b},blobToArrayBuffer:function(a,b){var c=new FileReader;c.onload=function(a){b(a.target.result)},c.readAsArrayBuffer(a)},blobToBinaryString:function(a,b){var c=new FileReader;c.onload=function(a){b(a.target.result)},c.readAsBinaryString(a)},binaryStringToArrayBuffer:function(a){for(var b=new Uint8Array(a.length),c=0;c<a.length;c++)b[c]=255&a.charCodeAt(c);return b.buffer},randomToken:function(){return Math.random().toString(36).substr(2)},isSecure:function(){return"https:"===location.protocol}};b.exports=g},{"./adapter":1,"js-binarypack":10}],9:[function(a,b){"use strict";function c(a,b,c){this.fn=a,this.context=b,this.once=c||!1}function d(){}d.prototype._events=void 0,d.prototype.listeners=function(a){if(!this._events||!this._events[a])return[];for(var b=0,c=this._events[a].length,d=[];c>b;b++)d.push(this._events[a][b].fn);return d},d.prototype.emit=function(a,b,c,d,e,f){if(!this._events||!this._events[a])return!1;var g,h,i,j=this._events[a],k=j.length,l=arguments.length,m=j[0];if(1===k){switch(m.once&&this.removeListener(a,m.fn,!0),l){case 1:return m.fn.call(m.context),!0;case 2:return m.fn.call(m.context,b),!0;case 3:return m.fn.call(m.context,b,c),!0;case 4:return m.fn.call(m.context,b,c,d),!0;case 5:return m.fn.call(m.context,b,c,d,e),!0;case 6:return m.fn.call(m.context,b,c,d,e,f),!0}for(h=1,g=new Array(l-1);l>h;h++)g[h-1]=arguments[h];m.fn.apply(m.context,g)}else for(h=0;k>h;h++)switch(j[h].once&&this.removeListener(a,j[h].fn,!0),l){case 1:j[h].fn.call(j[h].context);break;case 2:j[h].fn.call(j[h].context,b);break;case 3:j[h].fn.call(j[h].context,b,c);break;default:if(!g)for(i=1,g=new Array(l-1);l>i;i++)g[i-1]=arguments[i];j[h].fn.apply(j[h].context,g)}return!0},d.prototype.on=function(a,b,d){return this._events||(this._events={}),this._events[a]||(this._events[a]=[]),this._events[a].push(new c(b,d||this)),this},d.prototype.once=function(a,b,d){return this._events||(this._events={}),this._events[a]||(this._events[a]=[]),this._events[a].push(new c(b,d||this,!0)),this},d.prototype.removeListener=function(a,b,c){if(!this._events||!this._events[a])return this;var d=this._events[a],e=[];if(b)for(var f=0,g=d.length;g>f;f++)d[f].fn!==b&&d[f].once!==c&&e.push(d[f]);return this._events[a]=e.length?e:null,this},d.prototype.removeAllListeners=function(a){return this._events?(a?this._events[a]=null:this._events={},this):this},d.prototype.off=d.prototype.removeListener,d.prototype.addListener=d.prototype.on,d.prototype.setMaxListeners=function(){return this},d.EventEmitter=d,d.EventEmitter2=d,d.EventEmitter3=d,"object"==typeof b&&b.exports&&(b.exports=d)},{}],10:[function(a,b){function c(a){this.index=0,this.dataBuffer=a,this.dataView=new Uint8Array(this.dataBuffer),this.length=this.dataBuffer.byteLength}function d(){this.bufferBuilder=new g}function e(a){var b=a.charCodeAt(0);return 2047>=b?"00":65535>=b?"000":2097151>=b?"0000":67108863>=b?"00000":"000000"}function f(a){return a.length>600?new Blob([a]).size:a.replace(/[^\u0000-\u007F]/g,e).length}var g=a("./bufferbuilder").BufferBuilder,h=a("./bufferbuilder").binaryFeatures,i={unpack:function(a){var b=new c(a);return b.unpack()},pack:function(a){var b=new d;b.pack(a);var c=b.getBuffer();return c}};b.exports=i,c.prototype.unpack=function(){var a=this.unpack_uint8();if(128>a){var b=a;return b}if(32>(224^a)){var c=(224^a)-32;return c}var d;if((d=160^a)<=15)return this.unpack_raw(d);if((d=176^a)<=15)return this.unpack_string(d);if((d=144^a)<=15)return this.unpack_array(d);if((d=128^a)<=15)return this.unpack_map(d);switch(a){case 192:return null;case 193:return void 0;case 194:return!1;case 195:return!0;case 202:return this.unpack_float();case 203:return this.unpack_double();case 204:return this.unpack_uint8();case 205:return this.unpack_uint16();case 206:return this.unpack_uint32();case 207:return this.unpack_uint64();case 208:return this.unpack_int8();case 209:return this.unpack_int16();case 210:return this.unpack_int32();case 211:return this.unpack_int64();case 212:return void 0;case 213:return void 0;case 214:return void 0;case 215:return void 0;case 216:return d=this.unpack_uint16(),this.unpack_string(d);case 217:return d=this.unpack_uint32(),this.unpack_string(d);case 218:return d=this.unpack_uint16(),this.unpack_raw(d);case 219:return d=this.unpack_uint32(),this.unpack_raw(d);case 220:return d=this.unpack_uint16(),this.unpack_array(d);case 221:return d=this.unpack_uint32(),this.unpack_array(d);case 222:return d=this.unpack_uint16(),this.unpack_map(d);case 223:return d=this.unpack_uint32(),this.unpack_map(d)}},c.prototype.unpack_uint8=function(){var a=255&this.dataView[this.index];return this.index++,a},c.prototype.unpack_uint16=function(){var a=this.read(2),b=256*(255&a[0])+(255&a[1]);return this.index+=2,b},c.prototype.unpack_uint32=function(){var a=this.read(4),b=256*(256*(256*a[0]+a[1])+a[2])+a[3];return this.index+=4,b},c.prototype.unpack_uint64=function(){var a=this.read(8),b=256*(256*(256*(256*(256*(256*(256*a[0]+a[1])+a[2])+a[3])+a[4])+a[5])+a[6])+a[7];return this.index+=8,b},c.prototype.unpack_int8=function(){var a=this.unpack_uint8();return 128>a?a:a-256},c.prototype.unpack_int16=function(){var a=this.unpack_uint16();return 32768>a?a:a-65536},c.prototype.unpack_int32=function(){var a=this.unpack_uint32();return a<Math.pow(2,31)?a:a-Math.pow(2,32)},c.prototype.unpack_int64=function(){var a=this.unpack_uint64();return a<Math.pow(2,63)?a:a-Math.pow(2,64)},c.prototype.unpack_raw=function(a){if(this.length<this.index+a)throw new Error("BinaryPackFailure: index is out of range "+this.index+" "+a+" "+this.length);var b=this.dataBuffer.slice(this.index,this.index+a);return this.index+=a,b},c.prototype.unpack_string=function(a){for(var b,c,d=this.read(a),e=0,f="";a>e;)b=d[e],128>b?(f+=String.fromCharCode(b),e++):32>(192^b)?(c=(192^b)<<6|63&d[e+1],f+=String.fromCharCode(c),e+=2):(c=(15&b)<<12|(63&d[e+1])<<6|63&d[e+2],f+=String.fromCharCode(c),e+=3);return this.index+=a,f},c.prototype.unpack_array=function(a){for(var b=new Array(a),c=0;a>c;c++)b[c]=this.unpack();return b},c.prototype.unpack_map=function(a){for(var b={},c=0;a>c;c++){var d=this.unpack(),e=this.unpack();b[d]=e}return b},c.prototype.unpack_float=function(){var a=this.unpack_uint32(),b=a>>31,c=(a>>23&255)-127,d=8388607&a|8388608;return(0==b?1:-1)*d*Math.pow(2,c-23)},c.prototype.unpack_double=function(){var a=this.unpack_uint32(),b=this.unpack_uint32(),c=a>>31,d=(a>>20&2047)-1023,e=1048575&a|1048576,f=e*Math.pow(2,d-20)+b*Math.pow(2,d-52);return(0==c?1:-1)*f},c.prototype.read=function(a){var b=this.index;if(b+a<=this.length)return this.dataView.subarray(b,b+a);throw new Error("BinaryPackFailure: read index out of range")},d.prototype.getBuffer=function(){return this.bufferBuilder.getBuffer()},d.prototype.pack=function(a){var b=typeof a;if("string"==b)this.pack_string(a);else if("number"==b)Math.floor(a)===a?this.pack_integer(a):this.pack_double(a);else if("boolean"==b)a===!0?this.bufferBuilder.append(195):a===!1&&this.bufferBuilder.append(194);else if("undefined"==b)this.bufferBuilder.append(192);else{if("object"!=b)throw new Error('Type "'+b+'" not yet supported');if(null===a)this.bufferBuilder.append(192);else{var c=a.constructor;if(c==Array)this.pack_array(a);else if(c==Blob||c==File)this.pack_bin(a);
else if(c==ArrayBuffer)this.pack_bin(h.useArrayBufferView?new Uint8Array(a):a);else if("BYTES_PER_ELEMENT"in a)this.pack_bin(h.useArrayBufferView?new Uint8Array(a.buffer):a.buffer);else if(c==Object)this.pack_object(a);else if(c==Date)this.pack_string(a.toString());else{if("function"!=typeof a.toBinaryPack)throw new Error('Type "'+c.toString()+'" not yet supported');this.bufferBuilder.append(a.toBinaryPack())}}}this.bufferBuilder.flush()},d.prototype.pack_bin=function(a){var b=a.length||a.byteLength||a.size;if(15>=b)this.pack_uint8(160+b);else if(65535>=b)this.bufferBuilder.append(218),this.pack_uint16(b);else{if(!(4294967295>=b))throw new Error("Invalid length");this.bufferBuilder.append(219),this.pack_uint32(b)}this.bufferBuilder.append(a)},d.prototype.pack_string=function(a){var b=f(a);if(15>=b)this.pack_uint8(176+b);else if(65535>=b)this.bufferBuilder.append(216),this.pack_uint16(b);else{if(!(4294967295>=b))throw new Error("Invalid length");this.bufferBuilder.append(217),this.pack_uint32(b)}this.bufferBuilder.append(a)},d.prototype.pack_array=function(a){var b=a.length;if(15>=b)this.pack_uint8(144+b);else if(65535>=b)this.bufferBuilder.append(220),this.pack_uint16(b);else{if(!(4294967295>=b))throw new Error("Invalid length");this.bufferBuilder.append(221),this.pack_uint32(b)}for(var c=0;b>c;c++)this.pack(a[c])},d.prototype.pack_integer=function(a){if(a>=-32&&127>=a)this.bufferBuilder.append(255&a);else if(a>=0&&255>=a)this.bufferBuilder.append(204),this.pack_uint8(a);else if(a>=-128&&127>=a)this.bufferBuilder.append(208),this.pack_int8(a);else if(a>=0&&65535>=a)this.bufferBuilder.append(205),this.pack_uint16(a);else if(a>=-32768&&32767>=a)this.bufferBuilder.append(209),this.pack_int16(a);else if(a>=0&&4294967295>=a)this.bufferBuilder.append(206),this.pack_uint32(a);else if(a>=-2147483648&&2147483647>=a)this.bufferBuilder.append(210),this.pack_int32(a);else if(a>=-0x8000000000000000&&0x8000000000000000>=a)this.bufferBuilder.append(211),this.pack_int64(a);else{if(!(a>=0&&0x10000000000000000>=a))throw new Error("Invalid integer");this.bufferBuilder.append(207),this.pack_uint64(a)}},d.prototype.pack_double=function(a){var b=0;0>a&&(b=1,a=-a);var c=Math.floor(Math.log(a)/Math.LN2),d=a/Math.pow(2,c)-1,e=Math.floor(d*Math.pow(2,52)),f=Math.pow(2,32),g=b<<31|c+1023<<20|e/f&1048575,h=e%f;this.bufferBuilder.append(203),this.pack_int32(g),this.pack_int32(h)},d.prototype.pack_object=function(a){var b=Object.keys(a),c=b.length;if(15>=c)this.pack_uint8(128+c);else if(65535>=c)this.bufferBuilder.append(222),this.pack_uint16(c);else{if(!(4294967295>=c))throw new Error("Invalid length");this.bufferBuilder.append(223),this.pack_uint32(c)}for(var d in a)a.hasOwnProperty(d)&&(this.pack(d),this.pack(a[d]))},d.prototype.pack_uint8=function(a){this.bufferBuilder.append(a)},d.prototype.pack_uint16=function(a){this.bufferBuilder.append(a>>8),this.bufferBuilder.append(255&a)},d.prototype.pack_uint32=function(a){var b=4294967295&a;this.bufferBuilder.append((4278190080&b)>>>24),this.bufferBuilder.append((16711680&b)>>>16),this.bufferBuilder.append((65280&b)>>>8),this.bufferBuilder.append(255&b)},d.prototype.pack_uint64=function(a){var b=a/Math.pow(2,32),c=a%Math.pow(2,32);this.bufferBuilder.append((4278190080&b)>>>24),this.bufferBuilder.append((16711680&b)>>>16),this.bufferBuilder.append((65280&b)>>>8),this.bufferBuilder.append(255&b),this.bufferBuilder.append((4278190080&c)>>>24),this.bufferBuilder.append((16711680&c)>>>16),this.bufferBuilder.append((65280&c)>>>8),this.bufferBuilder.append(255&c)},d.prototype.pack_int8=function(a){this.bufferBuilder.append(255&a)},d.prototype.pack_int16=function(a){this.bufferBuilder.append((65280&a)>>8),this.bufferBuilder.append(255&a)},d.prototype.pack_int32=function(a){this.bufferBuilder.append(a>>>24&255),this.bufferBuilder.append((16711680&a)>>>16),this.bufferBuilder.append((65280&a)>>>8),this.bufferBuilder.append(255&a)},d.prototype.pack_int64=function(a){var b=Math.floor(a/Math.pow(2,32)),c=a%Math.pow(2,32);this.bufferBuilder.append((4278190080&b)>>>24),this.bufferBuilder.append((16711680&b)>>>16),this.bufferBuilder.append((65280&b)>>>8),this.bufferBuilder.append(255&b),this.bufferBuilder.append((4278190080&c)>>>24),this.bufferBuilder.append((16711680&c)>>>16),this.bufferBuilder.append((65280&c)>>>8),this.bufferBuilder.append(255&c)}},{"./bufferbuilder":11}],11:[function(a,b){function c(){this._pieces=[],this._parts=[]}var d={};d.useBlobBuilder=function(){try{return new Blob([]),!1}catch(a){return!0}}(),d.useArrayBufferView=!d.useBlobBuilder&&function(){try{return 0===new Blob([new Uint8Array([])]).size}catch(a){return!0}}(),b.exports.binaryFeatures=d;var e=b.exports.BlobBuilder;"undefined"!=typeof window&&(e=b.exports.BlobBuilder=window.WebKitBlobBuilder||window.MozBlobBuilder||window.MSBlobBuilder||window.BlobBuilder),c.prototype.append=function(a){"number"==typeof a?this._pieces.push(a):(this.flush(),this._parts.push(a))},c.prototype.flush=function(){if(this._pieces.length>0){var a=new Uint8Array(this._pieces);d.useArrayBufferView||(a=a.buffer),this._parts.push(a),this._pieces=[]}},c.prototype.getBuffer=function(){if(this.flush(),d.useBlobBuilder){for(var a=new e,b=0,c=this._parts.length;c>b;b++)a.append(this._parts[b]);return a.getBlob()}return new Blob(this._parts)},b.exports.BufferBuilder=c},{}],12:[function(a,b){function c(a,b){return this instanceof c?(this._dc=a,d.debug=b,this._outgoing={},this._incoming={},this._received={},this._window=1e3,this._mtu=500,this._interval=0,this._count=0,this._queue=[],void this._setupDC()):new c(a)}var d=a("./util");c.prototype.send=function(a){var b=d.pack(a);return b.size<this._mtu?void this._handleSend(["no",b]):(this._outgoing[this._count]={ack:0,chunks:this._chunk(b)},d.debug&&(this._outgoing[this._count].timer=new Date),this._sendWindowedChunks(this._count),void(this._count+=1))},c.prototype._setupInterval=function(){var a=this;this._timeout=setInterval(function(){var b=a._queue.shift();if(b._multiple)for(var c=0,d=b.length;d>c;c+=1)a._intervalSend(b[c]);else a._intervalSend(b)},this._interval)},c.prototype._intervalSend=function(a){var b=this;a=d.pack(a),d.blobToBinaryString(a,function(a){b._dc.send(a)}),0===b._queue.length&&(clearTimeout(b._timeout),b._timeout=null)},c.prototype._processAcks=function(){for(var a in this._outgoing)this._outgoing.hasOwnProperty(a)&&this._sendWindowedChunks(a)},c.prototype._handleSend=function(a){for(var b=!0,c=0,d=this._queue.length;d>c;c+=1){var e=this._queue[c];e===a?b=!1:e._multiple&&-1!==e.indexOf(a)&&(b=!1)}b&&(this._queue.push(a),this._timeout||this._setupInterval())},c.prototype._setupDC=function(){var a=this;this._dc.onmessage=function(b){var c=b.data,e=c.constructor;if(e===String){var f=d.binaryStringToArrayBuffer(c);c=d.unpack(f),a._handleMessage(c)}}},c.prototype._handleMessage=function(a){var b,c=a[1],e=this._incoming[c],f=this._outgoing[c];switch(a[0]){case"no":var g=c;g&&this.onmessage(d.unpack(g));break;case"end":if(b=e,this._received[c]=a[2],!b)break;this._ack(c);break;case"ack":if(b=f){var h=a[2];b.ack=Math.max(h,b.ack),b.ack>=b.chunks.length?(d.log("Time: ",new Date-b.timer),delete this._outgoing[c]):this._processAcks()}break;case"chunk":if(b=e,!b){var i=this._received[c];if(i===!0)break;b={ack:["ack",c,0],chunks:[]},this._incoming[c]=b}var j=a[2],k=a[3];b.chunks[j]=new Uint8Array(k),j===b.ack[2]&&this._calculateNextAck(c),this._ack(c);break;default:this._handleSend(a)}},c.prototype._chunk=function(a){for(var b=[],c=a.size,e=0;c>e;){var f=Math.min(c,e+this._mtu),g=a.slice(e,f),h={payload:g};b.push(h),e=f}return d.log("Created",b.length,"chunks."),b},c.prototype._ack=function(a){var b=this._incoming[a].ack;this._received[a]===b[2]&&(this._complete(a),this._received[a]=!0),this._handleSend(b)},c.prototype._calculateNextAck=function(a){for(var b=this._incoming[a],c=b.chunks,d=0,e=c.length;e>d;d+=1)if(void 0===c[d])return void(b.ack[2]=d);b.ack[2]=c.length},c.prototype._sendWindowedChunks=function(a){d.log("sendWindowedChunks for: ",a);for(var b=this._outgoing[a],c=b.chunks,e=[],f=Math.min(b.ack+this._window,c.length),g=b.ack;f>g;g+=1)c[g].sent&&g!==b.ack||(c[g].sent=!0,e.push(["chunk",a,g,c[g].payload]));b.ack+this._window>=c.length&&e.push(["end",a,c.length]),e._multiple=!0,this._handleSend(e)},c.prototype._complete=function(a){d.log("Completed called for",a);var b=this,c=this._incoming[a].chunks,e=new Blob(c);d.blobToArrayBuffer(e,function(a){b.onmessage(d.unpack(a))}),delete this._incoming[a]},c.higherBandwidthSDP=function(a){var b=navigator.appVersion.match(/Chrome\/(.*?) /);if(b&&(b=parseInt(b[1].split(".").shift()),31>b)){var c=a.split("b=AS:30"),d="b=AS:102400";if(c.length>1)return c[0]+d+c[1]}return a},c.prototype.onmessage=function(){},b.exports.Reliable=c},{"./util":13}],13:[function(a,b){var c=a("js-binarypack"),d={debug:!1,inherits:function(a,b){a.super_=b,a.prototype=Object.create(b.prototype,{constructor:{value:a,enumerable:!1,writable:!0,configurable:!0}})},extend:function(a,b){for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c]);return a},pack:c.pack,unpack:c.unpack,log:function(){if(d.debug){for(var a=[],b=0;b<arguments.length;b++)a[b]=arguments[b];a.unshift("Reliable: "),console.log.apply(console,a)}},setZeroTimeout:function(a){function b(b){d.push(b),a.postMessage(e,"*")}function c(b){b.source==a&&b.data==e&&(b.stopPropagation&&b.stopPropagation(),d.length&&d.shift()())}var d=[],e="zero-timeout-message";return a.addEventListener?a.addEventListener("message",c,!0):a.attachEvent&&a.attachEvent("onmessage",c),b}(this),blobToArrayBuffer:function(a,b){var c=new FileReader;c.onload=function(a){b(a.target.result)},c.readAsArrayBuffer(a)},blobToBinaryString:function(a,b){var c=new FileReader;c.onload=function(a){b(a.target.result)},c.readAsBinaryString(a)},binaryStringToArrayBuffer:function(a){for(var b=new Uint8Array(a.length),c=0;c<a.length;c++)b[c]=255&a.charCodeAt(c);return b.buffer},randomToken:function(){return Math.random().toString(36).substr(2)}};b.exports=d},{"js-binarypack":10}]},{},[3]);

Elm.PeerClient = Elm.PeerClient || {};
Elm.PeerClient.make = function (_elm) {
   "use strict";
   _elm.PeerClient = _elm.PeerClient || {};
   if (_elm.PeerClient.values) return _elm.PeerClient.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $Native$PeerClient = Elm.Native.PeerClient.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var receive = $Native$PeerClient.receive;
   var serverUpdates = $Native$PeerClient.serverUpdates;
   var makePeer = $Native$PeerClient.makePeer;
   var IntroPeer = function (a) {    return {ctor: "IntroPeer",_0: a};};
   var Message = F2(function (a,b) {    return {ctor: "Message",_0: a,_1: b};});
   var Peer = {ctor: "Peer"};
   return _elm.PeerClient.values = {_op: _op,makePeer: makePeer,serverUpdates: serverUpdates,receive: receive};
};
Elm.Main = Elm.Main || {};
Elm.Main.make = function (_elm) {
   "use strict";
   _elm.Main = _elm.Main || {};
   if (_elm.Main.values) return _elm.Main.values;
   var _U = Elm.Native.Utils.make(_elm),
   $Basics = Elm.Basics.make(_elm),
   $Debug = Elm.Debug.make(_elm),
   $Graphics$Element = Elm.Graphics.Element.make(_elm),
   $List = Elm.List.make(_elm),
   $Maybe = Elm.Maybe.make(_elm),
   $PeerClient = Elm.PeerClient.make(_elm),
   $Result = Elm.Result.make(_elm),
   $Signal = Elm.Signal.make(_elm),
   $Task = Elm.Task.make(_elm);
   var _op = {};
   var incomingPeer = $Signal.mailbox("null");
   var main = A2($Signal.map,function (x) {    return $Graphics$Element.show(x);},incomingPeer.signal);
   var incoming = $Signal.mailbox("null");
   var peer = $PeerClient.makePeer("r6pcbfr5ru1eb3xr");
   var incomingPeerPort = Elm.Native.Task.make(_elm).perform(A2($Task.andThen,peer,$PeerClient.receive(incomingPeer.address)));
   var incomingPort = Elm.Native.Task.make(_elm).perform(A2($Task.andThen,peer,$PeerClient.serverUpdates(incoming.address)));
   return _elm.Main.values = {_op: _op,peer: peer,incoming: incoming,incomingPeer: incomingPeer,main: main};
};
