var insertMode, commandMode, settings, shiftKey;
var modifier = "";

keyDown = function(e) {

  if (Visual.caretModeActive || Visual.visualModeActive) {
    if (e.which === 8) {
      e.preventDefault();
    }
    e.stopPropagation();
    Visual.selection = document.getSelection();
    if (e.which === 27 || (e.ctrlKey && e.which === 219)) {
      if (Visual.visualModeActive === false) {
        return Visual.exit();
      }
      Visual.visualModeActive = false;
      HUD.setMessage(" -- CARET -- ");
      Visual.collapse();
    }
    return;
  }

  if (e.which === 16) {
    return ((Hints.active && linkHoverEnabled) ? Hints.invertColors(true) : false);
  }
  if (!Object.prototype.hasOwnProperty("isVisible")) return false;

  var isInput = document.activeElement.isInput() || insertMode || Mappings.actions.inputFocused;

  var keyType = {
    arrow: (e.which >= 37 && e.which <= 40),
    modifier: (e.altKey || e.ctrlKey || e.metaKey),
    escape: (e.which === 27 && !this.modifier) || (e.which === 219 && e.ctrlKey)
  };

  modifier = "";

  if (keyType.modifier) {
    if (e.ctrlKey)
      modifier += "C-";
    if (e.metaKey)
      modifier += "M-";
    if (e.altKey)
      modifier += "A-";
    if (modifier.length > 0)
      modifier = "<" + modifier + (e.shiftKey? String.fromCharCode(e.which) : String.fromCharCode(e.which).toLowerCase()) + ">";
  }

  if (!isInput && e.which > 40 && e.which !== 91 && e.which !== 123) {
    e.stopPropagation();
    if (!commandMode && modifier !== "") {
      Mappings.convertToAction(modifier, function() {
        e.preventDefault();
      });
    }
  }

  if (!settings.disableInsertMappings && document.activeElement.isInput() && !insertMode && !keyType.escape && modifier !== "") {
    Mappings.insertCommand(modifier, function() {
      e.preventDefault();
      if (document.activeElement.id === "cVim-command-bar-input" && Command.type !== "search") Command.parse();
    });
  } else if (Hints.active) {
    if (e.which === 18) {
      Hints.changeFocus();
    } else if (keyType.escape || (e.which <= 40 && e.which !== 17)) {
      e.preventDefault();
      e.stopPropagation();
      Hints.hideHints();
      return true;
    }
  } else if (!commandMode) {
    if (keyType.escape || (!isInput && (e.which === 32 || e.which === 13))) {
      if (insertMode && !document.activeElement.isInput()) {
        insertMode = false;
        HUD.hide();
      } else if (Find.matches.length) {
        Find.clear();
        HUD.hide();
      }
      Mappings.actions.inputFocused = false;
      if (Mappings.queue !== "") {
        e.preventDefault();
        Mappings.queue = "";
        Mappings.repeats  = "";
      }
      if (isInput) document.activeElement.blur();
    } else if (!isInput && keyType.arrow && Mappings.isValidMapping(Mappings.arrowKeys[e.which - 37])) {
      e.preventDefault();
      Mappings.convertToAction(Mappings.arrowKeys[e.which - 37]);
    } else if (Mappings.actions.inputFocused && e.keyCode === 9) { // Tab
      if (!document.activeElement.isInput() || !Mappings.actions.inputElements.length) return Mappings.actions.inputFocused = false;
      e.preventDefault();
      Mappings.actions.inputElementsIndex = ((((e.shiftKey ? -1 : 1) + Mappings.actions.inputElementsIndex) % Mappings.actions.inputElements.length) + Mappings.actions.inputElements.length) % Mappings.actions.inputElements.length;
      Mappings.actions.inputElements[Mappings.actions.inputElementsIndex].focus();
    }
  } else if (keyType.escape) {
    Mappings.actions.inputFocused = false;
    if (Command.type === "search") {
      Find.clear();
      HUD.hide();
    }
    Command.hide();
  } else if (Command.bar.style.display === "inline-block" && document.activeElement.hasOwnProperty("cVim") && document.activeElement.id === "cVim-command-bar-input") {
    switch (e.keyCode) {
      case 18: case 17: case 91: case 123: case 16: // Ignore non-character keys (CTRL, SHIFT, etc)
        break;
      case 8: // Backspace
        if (Command.input.value === "") {
          e.preventDefault();
          Command.hide();
        } else if (Command.type === "search") {
          Find.clear();
          setTimeout(function() {
            if (Command.input.value !== "" && Command.input.value.length > 2) {
              Find.highlight(document.body, Command.input.value);
            } else {
              HUD.hide();
            }
          }, 0);
        } else if (Command.input.value !== "") {
          setTimeout(function() {
            Command.parse();
          }, 0);
        }
        break;
      case 9: // Tab
        if (!document.activeElement.isInput()) {
          Mappings.actions.inputFocused = false;
          break;
        }
        e.preventDefault();
        if (document.activeElement.hasOwnProperty("cVim")) {
          if (Command.type === "action") {
            if (Command.dataElements.length) {
              Search.nextResult(e.shiftKey);
            } else if (Command.input.value === "") {
              Command.complete("");
            }
          }
        }
        break;
      case 38: // Up
        e.preventDefault();
        Command.history.cycle(Command.type, true);
        break;
      case 40: // Down
        Command.history.cycle(Command.type, false);
        break;
      case 13: // Enter
        Command.enterHit = true;
        if (Command.type === "action" || Command.type === "search") {
          Command.input.value = Command.input.value.trimAround();
          if (Command.input.value.trim() !== "" && !(Command.history[Command.type].length > 0 && Command.history[Command.type].slice(-1)[0] === Command.input.value)) {
            Command.history[Command.type].push(Command.input.value);
            chrome.runtime.sendMessage({action: "appendHistory", value: Command.input.value, type: Command.type});
          }
          e.preventDefault();
          document.activeElement.blur();
          if (Command.type === "search") {
            if (Command.input.value !== "" && (Command.input.value !== Find.lastSearch || Find.matches.length === 0)) {
              Find.clear();
              Find.highlight(document.body, Command.input.value, false, false, false, true);
            }
            setTimeout(function() {
              Find.index = -1;
              Find.setIndex();
              Find.search(false, 1);
              Command.hide();
            }, 0);
          } else {
            Command.parse(Command.input.value);
          }
        }
        break;
      default:
        Command.history.reset = true;
        if (Command.type === "action") {
          setTimeout(function() {
            Command.parse();
          }, 0);
        } else {
          setTimeout(function() {
            if (Command.type === "search" && Command.input.value !== Find.lastSearch) {
              if (Command.input.value !== "") {
                Find.clear();
                if (Command.input.value.length > 2) {
                  Find.highlight(document.body, Command.input.value);
                }
              }
            }
          }, 2);
        }
        break;
    }
  }
};


keyPress = function(e) {
  if (Visual.caretModeActive || Visual.visualModeActive) {
    if (e.which !== 123) {
      e.preventDefault();
      e.stopPropagation();
      return Visual.action(String.fromCharCode(e.which));
    }
  } else {
    shiftKey = e.shiftKey;
    if (!insertMode && !document.activeElement.isInput()) {
      e.stopPropagation();
      setTimeout(function() {
        if (!modifier) {
          e.preventDefault();
          Mappings.convertToAction(String.fromCharCode(e.which));
        }
      }, 0);
    }
  }
};


var Mouse = {};
mouseMove = function(e) {
  Mouse.x = e.pageX;
  Mouse.y = e.pageY;
};


keyUp = function(e) {
  if (linkHoverEnabled && e.which === 16 && Hints.active) {
    shiftKey = false;
    Hints.invertColors(false);
  }
  if (!insertMode) {
    e.stopPropagation();
    e.preventDefault();
  }
};

function addListeners() {
  document.addEventListener("keypress", keyPress, true);
  document.addEventListener("keyup", keyUp, true);
  document.addEventListener("keydown", keyDown, true);
  document.addEventListener("mousemove", mouseMove, true);
}
function removeListeners() {
  document.removeEventListener("keypress", keyPress, true);
  document.removeEventListener("keyup", keyUp, true);
  document.removeEventListener("keydown", keyDown, true);
  document.removeEventListener("mousemove", mouseMove, true);
}

chrome.extension.onMessage.addListener(function(request, callback) {
  if (request.action === "toggleEnabled") {
    if (request.state === true) {
      Command.init(true);
    } else {
      Command.init(false);
    }
  } else if (request.action === "getBlacklistStatus") {
    callback(Command.blacklisted);
  }
});
