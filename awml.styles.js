// vim:sw=2
/* AWML-STYLES
 *
 */
(function(AWML) {
  "use strict";

  if (!AWML.Tags) AWML.Tags = {};

  function remove_styles(elem, styles) {
    var s = elem.style;
    
    for (var name in styles) {
      s.removeProperty(name);
    }
  }

  function id(v) { return v; }

  var TK = window.TK;

  if (!TK || !TK.S) {
    AWML.error('awml.styles.js depends on toolkit');
    return;
  }

  var C = 0;

  function register_style_tag(name, apply, remove) {
    return AWML.register_element(name, Object.assign({}, AWML.PrefixLogic, AWML.RedrawLogic, {
      createdCallback: function() {
        var O = {};
        this.awml_data = O;
        AWML.PrefixLogic.createdCallback.call(this);
        AWML.RedrawLogic.createdCallback.call(this);
        O.prev = null;
        O.get = null;
        O.c = C++;
        O.apply = apply;
        O.remove = remove;
        this.style.display = 'none';
      },
      attachedCallback: function() {
        AWML.PrefixLogic.attachedCallback.call(this);
        var b = this.awml_data.binding;
        if (b && b.has_value)
          this.trigger_redraw();
      },
      detachedCallback: function() {
        AWML.PrefixLogic.detachedCallback.call(this);
        this.remove_redraw();
      },
      receive: function(v) {
        var O = this.awml_data;
        if (!O.attached) return;
        this.trigger_redraw();
      },
      redraw: function() {
        AWML.RedrawLogic.redraw.call(this);
        var O = this.awml_data;
        var v = O.binding.value,
            transform = O.transform_receive,
            node = this.parentNode;
        if (!O.get) O.get = AWML.parse_format("js", this.textContent, id);
        if (transform) v = transform(v);
        if (O.prev) O.remove(node, O.prev);
        var s = O.get.call(this, v);
        O.prev = s;
        if (s) O.apply(node, s);
      },
      unbind: function(src) {
        var O = this.awml_data;
        this.remove_redraw();
        if (O.prev)
          O.remove(this.parentNode, O.prev);
        AWML.PrefixLogic.bind.call(this, src);
      },
    }));
  }

  AWML.Tags.Styles = register_style_tag("awml-styles", TK.set_styles, remove_styles);

  function remove_classes(node, c) {
    if (Array.isArray(c)) {
      TK.remove_class.apply(TK, [ node ].concat(c));
    } else {
      TK.remove_class(node, c);
    }
  }

  function add_classes(node, c) {
    if (Array.isArray(c)) {
      TK.add_class.apply(TK, [ node ].concat(c));
    } else {
      TK.add_class(node, c);
    }
  }

  AWML.Tags.Class = register_style_tag("awml-class", add_classes, remove_classes);

  function remove_attributes(node, attr) {
    for (var name in attr) {
      node.removeAttribute(name);
    }
  }

  function add_attributes(node, attr) {
    for (var name in attr) {
      node.setAttribute(name, attr[name]);
    }
  }

  AWML.Tags.Attributes = register_style_tag("awml-attributes", add_attributes, remove_attributes);
})(this.AWML || (this.AWML = {}));
