// \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
// node_modules/wxt/dist/virtual/reload-html.mjs
function print(method, ...args) {
	if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
	else method("[wxt]", ...args);
}
/** Wrapper around `console` with a "[wxt]" prefix */
var logger = {
	debug: (...args) => print(console.debug, ...args),
	log: (...args) => print(console.log, ...args),
	warn: (...args) => print(console.warn, ...args),
	error: (...args) => print(console.error, ...args)
};
var ws;
/** Connect to the websocket and listen for messages. */
function getDevServerWebSocket() {
	if (ws == null) {
		const serverUrl = "ws://localhost:3000";
		logger.debug("Connecting to dev server @", serverUrl);
		ws = new WebSocket(serverUrl, "vite-hmr");
		ws.addWxtEventListener = ws.addEventListener.bind(ws);
		ws.sendCustom = (event, payload) => ws?.send(JSON.stringify({
			type: "custom",
			event,
			payload
		}));
		ws.addEventListener("open", () => {
			logger.debug("Connected to dev server");
		});
		ws.addEventListener("close", () => {
			logger.debug("Disconnected from dev server");
		});
		ws.addEventListener("error", (event) => {
			logger.error("Failed to connect to dev server", event);
		});
		ws.addEventListener("message", (e) => {
			try {
				const message = JSON.parse(e.data);
				if (message.type === "custom") ws?.dispatchEvent(new CustomEvent(message.event, { detail: message.data }));
			} catch (err) {
				logger.error("Failed to handle message", err);
			}
		});
	}
	return ws;
}
try {
	getDevServerWebSocket().addWxtEventListener("wxt:reload-page", (event) => {
		if (event.detail === location.pathname.substring(1)) location.reload();
	});
} catch (err) {
	logger.error("Failed to setup web socket connection with dev server", err);
}

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXAtQjNvYWh0Q2ouanMiLCJuYW1lcyI6W10sInNvdXJjZXMiOlsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3d4dC9kaXN0L3ZpcnR1YWwvcmVsb2FkLWh0bWwubWpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vI3JlZ2lvbiBzcmMvdXRpbHMvaW50ZXJuYWwvbG9nZ2VyLnRzXG5mdW5jdGlvbiBwcmludChtZXRob2QsIC4uLmFyZ3MpIHtcblx0aWYgKGltcG9ydC5tZXRhLmVudi5NT0RFID09PSBcInByb2R1Y3Rpb25cIikgcmV0dXJuO1xuXHRpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIG1ldGhvZChgW3d4dF0gJHthcmdzLnNoaWZ0KCl9YCwgLi4uYXJncyk7XG5cdGVsc2UgbWV0aG9kKFwiW3d4dF1cIiwgLi4uYXJncyk7XG59XG4vKiogV3JhcHBlciBhcm91bmQgYGNvbnNvbGVgIHdpdGggYSBcIlt3eHRdXCIgcHJlZml4ICovXG5jb25zdCBsb2dnZXIgPSB7XG5cdGRlYnVnOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5kZWJ1ZywgLi4uYXJncyksXG5cdGxvZzogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUubG9nLCAuLi5hcmdzKSxcblx0d2FybjogKC4uLmFyZ3MpID0+IHByaW50KGNvbnNvbGUud2FybiwgLi4uYXJncyksXG5cdGVycm9yOiAoLi4uYXJncykgPT4gcHJpbnQoY29uc29sZS5lcnJvciwgLi4uYXJncylcbn07XG4vLyNlbmRyZWdpb25cbi8vI3JlZ2lvbiBzcmMvdXRpbHMvaW50ZXJuYWwvZGV2LXNlcnZlci13ZWJzb2NrZXQudHNcbmxldCB3cztcbi8qKiBDb25uZWN0IHRvIHRoZSB3ZWJzb2NrZXQgYW5kIGxpc3RlbiBmb3IgbWVzc2FnZXMuICovXG5mdW5jdGlvbiBnZXREZXZTZXJ2ZXJXZWJTb2NrZXQoKSB7XG5cdGlmIChpbXBvcnQubWV0YS5lbnYuQ09NTUFORCAhPT0gXCJzZXJ2ZVwiKSB0aHJvdyBFcnJvcihcIk11c3QgYmUgcnVubmluZyBXWFQgZGV2IGNvbW1hbmQgdG8gY29ubmVjdCB0byBjYWxsIGdldERldlNlcnZlcldlYlNvY2tldCgpXCIpO1xuXHRpZiAod3MgPT0gbnVsbCkge1xuXHRcdGNvbnN0IHNlcnZlclVybCA9IF9fREVWX1NFUlZFUl9PUklHSU5fXztcblx0XHRsb2dnZXIuZGVidWcoXCJDb25uZWN0aW5nIHRvIGRldiBzZXJ2ZXIgQFwiLCBzZXJ2ZXJVcmwpO1xuXHRcdHdzID0gbmV3IFdlYlNvY2tldChzZXJ2ZXJVcmwsIFwidml0ZS1obXJcIik7XG5cdFx0d3MuYWRkV3h0RXZlbnRMaXN0ZW5lciA9IHdzLmFkZEV2ZW50TGlzdGVuZXIuYmluZCh3cyk7XG5cdFx0d3Muc2VuZEN1c3RvbSA9IChldmVudCwgcGF5bG9hZCkgPT4gd3M/LnNlbmQoSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0dHlwZTogXCJjdXN0b21cIixcblx0XHRcdGV2ZW50LFxuXHRcdFx0cGF5bG9hZFxuXHRcdH0pKTtcblx0XHR3cy5hZGRFdmVudExpc3RlbmVyKFwib3BlblwiLCAoKSA9PiB7XG5cdFx0XHRsb2dnZXIuZGVidWcoXCJDb25uZWN0ZWQgdG8gZGV2IHNlcnZlclwiKTtcblx0XHR9KTtcblx0XHR3cy5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwgKCkgPT4ge1xuXHRcdFx0bG9nZ2VyLmRlYnVnKFwiRGlzY29ubmVjdGVkIGZyb20gZGV2IHNlcnZlclwiKTtcblx0XHR9KTtcblx0XHR3cy5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgKGV2ZW50KSA9PiB7XG5cdFx0XHRsb2dnZXIuZXJyb3IoXCJGYWlsZWQgdG8gY29ubmVjdCB0byBkZXYgc2VydmVyXCIsIGV2ZW50KTtcblx0XHR9KTtcblx0XHR3cy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCAoZSkgPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Y29uc3QgbWVzc2FnZSA9IEpTT04ucGFyc2UoZS5kYXRhKTtcblx0XHRcdFx0aWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJjdXN0b21cIikgd3M/LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KG1lc3NhZ2UuZXZlbnQsIHsgZGV0YWlsOiBtZXNzYWdlLmRhdGEgfSkpO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGxvZ2dlci5lcnJvcihcIkZhaWxlZCB0byBoYW5kbGUgbWVzc2FnZVwiLCBlcnIpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdHJldHVybiB3cztcbn1cbi8vI2VuZHJlZ2lvblxuLy8jcmVnaW9uIHNyYy92aXJ0dWFsL3JlbG9hZC1odG1sLnRzXG5pZiAoaW1wb3J0Lm1ldGEuZW52LkNPTU1BTkQgPT09IFwic2VydmVcIikgdHJ5IHtcblx0Z2V0RGV2U2VydmVyV2ViU29ja2V0KCkuYWRkV3h0RXZlbnRMaXN0ZW5lcihcInd4dDpyZWxvYWQtcGFnZVwiLCAoZXZlbnQpID0+IHtcblx0XHRpZiAoZXZlbnQuZGV0YWlsID09PSBsb2NhdGlvbi5wYXRobmFtZS5zdWJzdHJpbmcoMSkpIGxvY2F0aW9uLnJlbG9hZCgpO1xuXHR9KTtcbn0gY2F0Y2ggKGVycikge1xuXHRsb2dnZXIuZXJyb3IoXCJGYWlsZWQgdG8gc2V0dXAgd2ViIHNvY2tldCBjb25uZWN0aW9uIHdpdGggZGV2IHNlcnZlclwiLCBlcnIpO1xufVxuLy8jZW5kcmVnaW9uXG5leHBvcnQge307XG4iXSwiaWdub3JlTGlzdCI6WzBdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLFNBQVMsTUFBTSxRQUFRLEdBQUcsTUFBTTtDQUUvQixJQUFJLE9BQU8sS0FBSyxPQUFPLFVBQVUsT0FBTyxTQUFTLEtBQUssTUFBTSxLQUFLLEdBQUcsSUFBSTtNQUNuRSxPQUFPLFNBQVMsR0FBRyxJQUFJO0FBQzdCOztBQUVBLElBQU0sU0FBUztDQUNkLFFBQVEsR0FBRyxTQUFTLE1BQU0sUUFBUSxPQUFPLEdBQUcsSUFBSTtDQUNoRCxNQUFNLEdBQUcsU0FBUyxNQUFNLFFBQVEsS0FBSyxHQUFHLElBQUk7Q0FDNUMsT0FBTyxHQUFHLFNBQVMsTUFBTSxRQUFRLE1BQU0sR0FBRyxJQUFJO0NBQzlDLFFBQVEsR0FBRyxTQUFTLE1BQU0sUUFBUSxPQUFPLEdBQUcsSUFBSTtBQUNqRDtBQUdBLElBQUk7O0FBRUosU0FBUyx3QkFBd0I7Q0FFaEMsSUFBSSxNQUFNLE1BQU07RUFDZixNQUFNLFlBQUE7RUFDTixPQUFPLE1BQU0sOEJBQThCLFNBQVM7RUFDcEQsS0FBSyxJQUFJLFVBQVUsV0FBVyxVQUFVO0VBQ3hDLEdBQUcsc0JBQXNCLEdBQUcsaUJBQWlCLEtBQUssRUFBRTtFQUNwRCxHQUFHLGNBQWMsT0FBTyxZQUFZLElBQUksS0FBSyxLQUFLLFVBQVU7R0FDM0QsTUFBTTtHQUNOO0dBQ0E7RUFDRCxDQUFDLENBQUM7RUFDRixHQUFHLGlCQUFpQixjQUFjO0dBQ2pDLE9BQU8sTUFBTSx5QkFBeUI7RUFDdkMsQ0FBQztFQUNELEdBQUcsaUJBQWlCLGVBQWU7R0FDbEMsT0FBTyxNQUFNLDhCQUE4QjtFQUM1QyxDQUFDO0VBQ0QsR0FBRyxpQkFBaUIsVUFBVSxVQUFVO0dBQ3ZDLE9BQU8sTUFBTSxtQ0FBbUMsS0FBSztFQUN0RCxDQUFDO0VBQ0QsR0FBRyxpQkFBaUIsWUFBWSxNQUFNO0dBQ3JDLElBQUk7SUFDSCxNQUFNLFVBQVUsS0FBSyxNQUFNLEVBQUUsSUFBSTtJQUNqQyxJQUFJLFFBQVEsU0FBUyxVQUFVLElBQUksY0FBYyxJQUFJLFlBQVksUUFBUSxPQUFPLEVBQUUsUUFBUSxRQUFRLEtBQUssQ0FBQyxDQUFDO0dBQzFHLFNBQVMsS0FBSztJQUNiLE9BQU8sTUFBTSw0QkFBNEIsR0FBRztHQUM3QztFQUNELENBQUM7Q0FDRjtDQUNBLE9BQU87QUFDUjtBQUd5QyxJQUFJO0NBQzVDLHNCQUFzQixDQUFDLENBQUMsb0JBQW9CLG9CQUFvQixVQUFVO0VBQ3pFLElBQUksTUFBTSxXQUFXLFNBQVMsU0FBUyxVQUFVLENBQUMsR0FBRyxTQUFTLE9BQU87Q0FDdEUsQ0FBQztBQUNGLFNBQVMsS0FBSztDQUNiLE9BQU8sTUFBTSx5REFBeUQsR0FBRztBQUMxRSJ9