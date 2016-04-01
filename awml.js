// vim:sw=2
"use strict";
(function(w) {
  function Option(name, value, attach, detach) {
    this.name = name;
    this.value = value;
    this._attach = attach;
    this._detach = detach;
    this.node = null;
    this.widget = null;
  };
  // FIXME: do proper inheritance
  Option.prototype = {
    detach: function(node, widget) {
        if (this._detach) this._detach(node, widget);
        this.node = null;
        this.widget = null;
    },
    attach: function(node, widget) {
        this.node = node;
        this.widget = widget;
        if (this._attach) this._attach(node, widget);
    },
  };
  function MediaOption(name, value) {
      this.mql = window.matchMedia(value);
      this.handler = function() {
          this.widget.set(this.name, this.mql.matches);
        }.bind(this);

      Option.call(this, name, this.mql.matches,
          function () {
            this.mql.addListener(this.handler);
            this.handler();
          },
          function () {
            this.mql.removeListener(this.handler);
          });
  };
  MediaOption.prototype = Object.create(Option.prototype);
  function ParentOption(name, option_name) {
      this.option_name = option_name;
      this.handler = function(value) {
                        this.widget.set(this.name, value);
                    }.bind(this);
      Option.call(this, name, undefined,
                  function(node, widget) {
                    var parent = find_parent.call(node);
                    var o = parent.widget;
                    o.add_event("set_"+this.option_name, this.handler);
                    this.handler(o.get(this.option_name));
                  },
                  function(node, widget) {
                    var o = this.widget.parent;
                    if (o)
                      o.remove_event("set_"+this.option_name, this.handler);
                  });
  }
  ParentOption.prototype = Object.create(Option.prototype);
  function check_option(widget, key, value) {
      var type = widget._options[key];
      if (type) {
        if (typeof value !== type) {
          if (type === "int" && typeof value === "number" ||
              type === "array" && typeof value === "object" && value instanceof Array) {
            return;
          }
          AWML.warn("Type mismatch for option %o. Expected type %o. Got %o.",
                    key, widget._options[key], value);
        }
      }
  }
  function check_options(widget, options) {
    for (var key in options) {
      check_option(widget, key, options[key]);
    }
    return options;
  }
  function attach_option(node, widget, name, value) {
      if (value instanceof Option) {
          value.attach(node, widget);
      } else if (typeof value !== "undefined") {
          check_option(widget, name, value);
          widget.set(name, value);
      }
  }
  function attach_options(node, widget, options) {
      for (var key in options) {
          attach_option(node, widget, key, options[key]);
      }
  }
  function detach_option(node, widget, name, value) {
      if (value instanceof Option) {
          value.detach(node, widget);
      } else if (value !== undefined) {
          // we set it back to the default
          widget.set(name, undefined);
      }
  }
  function update_option(node, widget, name, value_old, value_new) {
      detach_option(node, widget, name, value_old);
      attach_option(node, widget, name, value_new);
  }
  function option_value(value) {
      if (value instanceof Option) return value.value;
      return value;
  }
  function has_attribute(widget, name) {
      if (widget._options[name] || name.charCodeAt(0) === 95) {
          // If the widget does not internally use the awml element itself, we have to 
          // actually use id/class. This is buggy because the 'wrong' element ends
          // up with the same class/id. We need to fix this somehow, but its not really
          // possible without renaming the option. FIXME
          return name !== "id" && name !== "class" || !widget._options.element;
      }
      return false;
  }
  function evaluate_options(options) {
      var ret = {};
      for (var key in options) {
          var v = option_value(options[key]);
          if (v !== undefined) ret[key] = v;
      }
      return ret;
  }
  function parse_type(type, x) {
      switch (type) {
      case "js":
        x = x.replace(/^\s*/g, "");
        x = x.replace(/\s*$/g, "");
        try {
            return new Function([], "return ("+x+");")();
        } catch (e) {
            AWML.error("Syntax error", e, "in", x);
            return undefined;
        }
      case "json":
        try {
            return JSON.parse(x);
        } catch (e) {
            AWML.error("Syntax error", e, "in JSON", x);
            return undefined;
        }
      case "string":
        return x;
      case "number":
        return parseFloat(x);
      case "int":
        return parseInt(x);
      case "sprintf":
        return TK.FORMAT(x);
      case "inherit":
        return AWML.options[x];
      default:
        AWML.error("unsupported type", type);
        return undefined;
      }
  }
  function parse_option(name, type, value) {
      if (type === "media") {
        if (!window.matchMedia) {
            AWML.error("media type AWML options are not supported in this browser:", x);
        }
        return new MediaOption(name, value);
      } else if (type === "parent-option") {
        return new ParentOption(name, value);
      } else {
        return parse_type(type, value);
      }
  }
  function parse_attribute(name, x) {
      var match;

      if (typeof x !== "string") return undefined;

      if (match = x.match(/^([^:]*):(.*)/m)) {
          x = parse_option(name, match[1], match[2]);
      } else if (parseFloat(x).toString() === x) {
          x = parseFloat(x);
      } else if (x === "true") {
          x = true;
      } else if (x === "false") {
          x = false;
      }

      return x;
  }
  function do_merge_options(o1, o2) {
    var x;
    var ret = {};

    if (!o1)
        return o2;
    if (!o2)
        return o1;

    for (x in o1)
        ret[x] = o1[x];

    for (x in o2) {
        if (typeof ret[x] === "object" &&
            typeof o2[x] === "object" &&
            Object.getPrototypeOf(ret[x]) == null &&
            Object.getPrototypeOf(o2[x]) == null)
            ret[x] = do_merge_options(ret[x], o2[x]);
        else
            ret[x] = o2[x];
    }

    return ret;
  }
  function find_parent() {
      var node = this.parentNode;

      if (!node)
          return undefined;

      do
          if (node.is_toolkit_node)
              return node;
      while (node = node.parentNode);

      return undefined;
  };

  AWML.find_parent_widget = find_parent;

  function extract_options(widget) {
    var O = widget.prototype._options;
    var tagName = this.tagName;
    var attr = this.attributes;
    var merge_options;
    var options = {};
    for (var i = 0; i < attr.length; i++) {
        var name = attr[i].name;
        var value = attr[i].value;

        if (name === "expanded") {
            options._expanded = parse_attribute("_expanded", value);
            if (typeof options._expanded === "string")
                options._expanded = true;
            continue;
        } else if (name === "collapsed") {
            options._collapsed = parse_attribute("_collapsed", value);
            if (typeof options._collapsed === "string")
                options._collapsed = true;
            continue;
        } else if (name == "options") {
            merge_options = AWML.options[value];
            continue;
        }

        if (widget.prototype._options[name] || name.charCodeAt(0) === 95) {
            if (!widget.prototype._options.element) {
                // TODO: we should really remove the id, to avoid collisions, but
                // this does not currently work
                /*
                    if (name === "id")
                        this.removeAttribute("id");
                */
                options[name] = parse_attribute(name, value);
            } else if (name !== "id" && name !== "class")
                options[name] = parse_attribute(name, value);
        }
    }
    options = do_merge_options(merge_options, options);
    options = do_merge_options(AWML.options.defaults[tagName], options);
    return options;
  }

  var _warn_stack = [ TK.warn ];
  
  AWML.warn = function() {
    _warn_stack[_warn_stack.length-1].apply(this, arguments);
  };
  AWML.error = function() {
    if (_warn_stack.length != 1)
      AWML.warn.apply(this, arguments);
    TK.error.apply(TK, arguments);
  };
  AWML.push_warn = function(f) {
    _warn_stack.push(f);
  };
  AWML.pop_warn = function() {
    if (_warn_stack.length > 1) {
      _warn_stack.length--;
    }
  };
  AWML.options = { defaults: {} };
  AWML.set_default = function (tag, name, value) {
    var d = this.options.defaults;
    if (!d.hasOwnProperty(tag)) d[tag] = {};
    d[tag][name] = value;
  };
  AWML.registerWidget = function registerWidget(tagName, widget) {
    var proto = Object.create(HTMLElement.prototype);
    proto.createdCallback = function() {
      var options = this.options = extract_options.call(this, widget);
      if (widget.prototype._options.element)
          options.element = this;
      this.widget = new widget(check_options(widget.prototype, evaluate_options(options)));
      attach_options(this, this.widget, options);
    };
    proto.attachedCallback = function() {
      var parent_node = find_parent.call(this);
      if (parent_node) parent_node.widget.add_child(this.widget);
      else if (!(this.widget instanceof TK.Root)) AWML.error("could not find parent for", this);
    };
    proto.detachedCallback = function() {
        if (this.widget.parent)
            this.widget.parent.remove_child(this.widget);
    };
    proto.attributeChangedCallback = function(name, old_value, value) {
        if (this.widget && has_attribute(this.widget, name)) {
            value = parse_attribute(name, value);

            update_option(this, this.widget, name, this.options[name], value);

            this.options[name] = value;
        }
    };
    proto.is_toolkit_node = true;
    var O = { prototype: proto };
    return document.registerElement(tagName, O);
  };

  for (var key in TK) {
      var f = TK[key];
      if (typeof f === "function" && f.prototype && Widget.prototype.isPrototypeOf(f.prototype)) {
          AWML[key] = AWML.registerWidget("awml-"+key.toLowerCase(), f);
      }
  }

  AWML.Option = document.registerElement("awml-option", {
    prototype: Object.assign(Object.create(HTMLElement.prototype), {
       is_toolkit_node: true,
       createdCallback: function() {
            var data = this.textContent;
            var name = this.getAttribute("name");
            var type = this.getAttribute("type") || "string";

            data = parse_option(name, type, data);
            this.name = name;
            this.data = data;
            this.type = type;
            this.style.display = "none";
      },
      attachedCallback: function() {
        var parent_node = find_parent.call(this);
        if (!this.name) {
            return;
        }
        if (parent_node) parent_node.widget.set(this.name, this.data);
      }
    })
  });

  AWML.Page = document.registerElement("awml-page", {
    prototype: Object.assign(Object.create(HTMLElement.prototype), {
       is_toolkit_node: true,
       createdCallback: function() {
            var label = this.getAttribute("label");
            var options = extract_options.call(this, TK.Container);
            options.element = this;
            this.label = label;
            this.widget = new TK.Container(options);
      },
      attributeChangedCallback: function(name, old_value, value) {
          if (name !== "class" && name !== "id")
            TK.warn("not implemented");
      },
      detachedCallback: function() {
          TK.warn("not implemented");
      },
      attachedCallback: function() {
        if (this._is_attached) return;
        var parent_node = find_parent.call(this);
        // TODO:
        //  - error handling, what if parent is not a pager
        //  - this breaks if you move pages around
        if (parent_node) {
            this._is_attached = true;
            window.setTimeout(function() {
                parent_node.widget.add_page(this.label, this.widget);
            }.bind(this), 0);
        }
      }
    })
  });
  AWML.Filter = document.registerElement("awml-filter", {
    prototype: Object.assign(Object.create(HTMLElement.prototype), {
      is_toolkit_node: true,
      createdCallback: function() {
        this.style.display = "none";
        this.options = extract_options.call(this, TK.EqBand);
      },
      attachedCallback: function() {
        var node = find_parent.call(this);
        if (node) {
          if (this.widget) node.widget.remove_band(this.widget);
          this.widget = node.widget.add_band(this.options);
        }
      },
      detachedCallback: function() {
        var node = find_parent.call(this);
        if (node && this.widget) {
          node.widget.remove_band(this.widget);
          this.widget = false;
        }
      }
    })
  });
  AWML.Event = document.registerElement("awml-event", {
    prototype: Object.assign(Object.create(HTMLElement.prototype), {
      createdCallback: function() {
          this.type = this.getAttribute("type");
          this.fun = parse_type("js", this.textContent);
          this.style.display = "none";
      },
      attributeChangedCallback: function(name, old_value, value) {
          TK.warn("not implemented");
      },
      detachedCallback: function() {
        var parent_node = find_parent.call(this);
        if (parent_node) {
            parent_node.widget.remove_event(this.type, this.fun);
        }
      },
      attachedCallback: function() {
        var parent_node = find_parent.call(this);
        if (parent_node) {
            parent_node.widget.add_event(this.type, this.fun);
        }
      }
    })
  });
})(this.AWML || (this.AWML = {}));
