define([
    'bean',
    'bonzo',
    'lodash/functions/debounce',
    'common/utils/request-animation-frame',
    'common/utils/mediator'
], function(bean, bonzo, debounce, raf, mediator) {

    var Affix = function (options) {

        bean.on(window, 'scroll', debounce(this.checkPositionWithEventLoop.bind(this), 10));
        bean.on(window, 'click', this.checkPositionWithEventLoop.bind(this));

        // Use mediator here, because the standard debounce time interval is adequate, unlike scroll.
        mediator.addListener('window:resize', this.calculateContainerPositioning.bind(this));

        this.affixed  = null;
        this.$markerTop = bonzo(options.topMarker);
        this.$markerBottom = bonzo(options.bottomMarker);
        this.$container = bonzo(options.containerElement);
        this.$element = bonzo(options.element);
        this.$window = bonzo(document.body);

        // Take into account the element's top style, so that the fixed positioning happens smoothly.
        var styleTop = this.$element.css('top');
        this.styleTop = styleTop !== 'auto' ? parseInt(styleTop, 10) : 0;

        this.calculateContainerPositioning();
    };

    Affix.CLASS = 'affix';

    Affix.prototype.calculateContainerPositioning = function() {

        // The absolute-positioned container defines the static positioning of the affix element.
        this.$container.css('top', '0');
        var containerTop = this.$markerTop.offset().top - this.$container.offset().top;
        this.$container.css('top', containerTop + 'px');
    };

    Affix.prototype.checkPositionWithEventLoop = function() {
        raf(this.checkPosition.bind(this));
    };

    Affix.prototype.checkPosition = function () {
        var elementTop   = this.$window.scrollTop() + this.styleTop,
            topCheck     = elementTop >= this.$markerTop.offset().top,
            bottomCheck  = elementTop + this.$element.dim().height < this.$markerBottom.offset().top;

        // This is true when the element is positioned below the top threshold and above the bottom threshold.
        var affix = bottomCheck && topCheck;

        if (this.affixed !== affix) {
            this.affixed = affix;

            if (affix) {
                this.$element.addClass(Affix.CLASS);
            } else {
                this.$element.removeClass(Affix.CLASS);
            }
        }
    };
    return Affix;
});