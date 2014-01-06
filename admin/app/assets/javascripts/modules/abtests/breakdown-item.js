/*
 Module: breakdown-item.js
 Description: Displays information about a single test
 */
define([
    'lodash/main',
    'common/modules/component'
], function (
    _,
    Component
    ) {

    function BreakdownItem(config) {
        this.config = _.extend(this.config, config);
    }

    Component.define(BreakdownItem);

    BreakdownItem.prototype.config = {
        test: {}
    };

    BreakdownItem.prototype.templateName = 'breakdown-item-template';
    BreakdownItem.prototype.componentClass = 'breakdown-item';
    BreakdownItem.prototype.classes = {
        name: 'name',
        expiry: 'expiry',
        audience: 'audience',
        audienceOffset: 'audience-offset',
        description: 'description',
        variants: 'variants'
    };
    BreakdownItem.prototype.useBem = true;

    BreakdownItem.prototype.prerender = function() {
        this.getElem(this.classes.name).textContent = this.config.test.id;
        this.getElem(this.classes.description).textContent = this.config.test.description;
        this.getElem(this.classes.expiry).textContent = this.config.test.expiry;
        this.getElem(this.classes.audience).textContent = this.config.test.audience;
        this.getElem(this.classes.audienceOffset).textContent = this.config.test.audienceOffset;
        this.getElem(this.classes.variants).textContent = _.pluck(this.config.test.variants, 'id').join(', ');
    };

    return BreakdownItem;

});
