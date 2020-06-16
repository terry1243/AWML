import { BaseOption } from './base.js';
import { registerOptionType } from '../components/option.js';
import { parseAttribute } from '../utils/parse_attribute.js';

export class StaticOption extends BaseOption {
  constructor(options) {
    super(options);

    this.widget.set(this.name, options.value);
  }

  static optionsFromNode(node) {
    const options = BaseOption.optionsFromNode(node);
    const format = node.getAttribute('format') || 'json';

    options.value = parseAttribute(format, node.getAttribute('value'));

    return options;
  }

  destroy() {
    super.destroy();
    this.widget.reset(this.name);
  }
}

registerOptionType('static', StaticOption);