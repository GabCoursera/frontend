/* global googletag: false */
define([
    'common/$',
    'bonzo',
    'postscribe',
    'common/modules/component',
    'lodash/objects/assign',
    'lodash/functions/debounce',
    'common/utils/cookies',
    'common/utils/detect',
    'common/utils/mediator',
    'common/modules/analytics/commercial/tags/common/audience-science',
    'common/modules/adverts/userAdTargeting'
], function (
    $,
    bonzo,
    postscribe,
    Component,
    extend,
    debounce,
    Cookies,
    detect,
    mediator,
    AudienceScience,
    UserAdTargeting
) {

    /**
     * Right, so an explanation as to how this works...
     *
     * Create a new ad slot using the following code:
     *
     * <div class="ad-slot__dfp AD_SLOT_CLASS" data-name="AD_SLOT_NAME" data-mobile="300,50|320,50" data-desktop="300,250" data-refresh="false" data-label="false">
     *     <div id="SLOT_ID" class="ad-container"></div>
     * </div>
     *
     * You can set the set which size ad(s) should be loaded at which breakpoint by using the
     * data attribute. The available breakpoints and their sizes are listed in the config below.
     * You do not need to specify all of these. If you set a mobile size, then that size will be used
     * for all ads in that slot until another breakpoint is detected, in the above case, that's desktop.
     *
     * There is also a function for breaking the ad content out of their iframes. This can be done by
     * adding the classes below (breakoutHash) to the ad content (in DFP).
     *
     * Labels are automatically prepended to an ad that was successfully loaded.
     *
     * TODO: breakoutHash could just be one class and the script tag moved to inside the ad
     *
     */

    var breakoutHash = {
        'breakout__html': '%content%',
        'breakout__script': '<script>%content%</script>'
    };

    function DFP(config) {
        this.context = document;
        this.config = extend(this.config, config);
    }

    Component.define(DFP);

    DFP.prototype.$dfpAdSlots   = [];
    DFP.prototype.adsToRefresh = [];

    DFP.prototype.config = {
        dfpUrl: '//www.googletagservices.com/tag/js/gpt.js',
        dfpSelector: '.ad-slot__dfp',
        adContainerClass: '.ad-container',
        // These should match the widths inside _vars.scss
        breakpoints: {
            mobile: 0,
            tabletportrait: 740,
            tabletlandscape: 900,
            desktop: 980,
            wide: 1300
        }
    };

    DFP.prototype.setListeners = function() {
        var parseAd = this.parseAd;
        googletag.pubads().addEventListener('slotRenderEnded', parseAd.bind(this));
    };

    /**
     * Sets the approiate page level targetting
     *
     * a      = audience science
     * at     = adtest cookie
     * bp     = current breakpoint
     * cat    = section
     * ct     = content type
     * gdncrm = user ad targetting
     * k      = keywords
     * p      = platform
     * pt     = content type
     */
    DFP.prototype.setPageTargetting = function() {
        var conf         = this.config.page,
            keywords     = conf.keywords    ? conf.keywords.split(',')       : '',
            section      = conf.section     ? conf.section.toLowerCase()     : '',
            contentType  = conf.contentType ? conf.contentType.toLowerCase() : '';

        googletag.pubads().setTargeting('a', AudienceScience.getSegments() || [])
                          .setTargeting('at', Cookies.get('adtest') || '')
                          .setTargeting('bp', detect.getBreakpoint())
                          .setTargeting('cat', section)
                          .setTargeting('ct', contentType)
                          .setTargeting('gdncrm', UserAdTargeting.getUserSegments() || [])
                          .setTargeting('k', keywords)
                          .setTargeting('p', 'ng')
                          .setTargeting('pt', contentType);
    };

    /**
     * Loop through each slot detected on the page and define it based on the data
     * attributes on the element.
     */
    DFP.prototype.defineSlots = function() {
        var self    = this,
            section = this.config.page.isFront ? 'networkfront' : this.config.page.section,
            account = '/'+ this.config.page.dfpAccountId +'/'+ this.config.page.dfpAdUnitRoot +'/'+ section;

        this.$dfpAdSlots.each(function(adSlot) {

            var id          = adSlot.querySelector(self.config.adContainerClass).id,
                name        = adSlot.getAttribute('data-name'),
                sizeMapping = self.defineSlotSizes(adSlot),
                size        = [sizeMapping[0][1][0], sizeMapping[0][1][1]],
                refresh     = adSlot.getAttribute('data-refresh') !== 'false',

                slot = googletag.defineSlot(account, size, id)
                                .addService(googletag.pubads())
                                .defineSizeMapping(sizeMapping)
                                .setTargeting('slot', name);

            // Add to the array of ads to be refreshed (when the breakpoint changes)
            // only if it's `data-refresh` attribute isn't set to false.
            if(refresh) {
                self.adsToRefresh.push(slot);
            }
        });
    };

    /** A breakpoint can have various sizes assigned to it. You can assign either on
     * set of sizes or multiple.
     *
     * One size       - `data-mobile="300,50"`
     * Multiple sizes - `data-mobile="300,50|320,50"`
     */
    DFP.prototype.createSizeMapping = function(attr) {
        return attr.split('|').map(function(size) {
            return size.split(',').map(Number);
        });
    };


    /**
     * Builds and assigns the correct size map for a slot based on the breakpoints
     * attached to the element via data attributes.
     *
     * A new size map is created for a given slot. We then loop through each breakpoint
     * defined in the config, checking if that breakpoint has been set on the slot.
     *
     * If it has been defined, then we add that size to the size mapping.
     *
     */
    DFP.prototype.defineSlotSizes = function(slot) {
        var self    = this,
            mapping = googletag.sizeMapping();

        for(var breakpoint in this.config.breakpoints) {
            var attr  = slot.getAttribute('data-'+ breakpoint),
                width = self.config.breakpoints[breakpoint];

            if(attr) {
                mapping.addSize([width, 0], self.createSizeMapping(attr));
            }
        }

        return mapping.build();
    };

    DFP.prototype.parseAd = function(event) {
        var $slot = $('#'+ event.slot.getSlotId().getDomId());

        if(event.isEmpty) {
            this.removeLabel($slot);
        } else {
            this.checkForBreakout($slot);
            this.addLabel($slot);
        }

    };

    /**
     * Checks the contents of the ad for special classes (see breakoutHash).
     *
     * If one of these classes is detected, then the contents of that iframe is retrieved
     * and written onto the parent page.
     *
     * Currently this is being used for sponsered logos and commercial components so they
     * can inherit fonts.
     */
    DFP.prototype.checkForBreakout = function($slot) {
        var frameContents = $slot[0].querySelector('iframe').contentDocument.body;

        for(var cls in breakoutHash) {
            var $el = bonzo(frameContents.querySelector('.'+ cls));

            if($el.length > 0) {
                $slot.html('');
                postscribe($slot[0], breakoutHash[cls].replace(/%content%/g, $el.html()));
            }
        }
    };

    DFP.prototype.addLabel = function($slot) {
        var $parent = $slot.parent();

        if(this.shouldRenderLabel($slot)) {
            $parent.prepend('<div class="ad-slot__label">Advertisement</div>');
            $parent.addClass('ad-label--showing');
        }
    };

    DFP.prototype.shouldRenderLabel = function($slot) {
        var $parent = $slot.parent();

        return !($slot[0].style.display === 'none' || $parent.hasClass('ad-label--showing') || $parent.data('label') === false);
    };

    DFP.prototype.removeLabel = function($slot) {
        $slot.parent().removeClass('ad-label--showing');
        $slot.previous().remove();
    };

    DFP.prototype.fireAdRequest = function() {
        googletag.pubads().enableSingleRequest();
        googletag.pubads().enableAsyncRendering();
        googletag.pubads().collapseEmptyDivs();
        googletag.enableServices();
        googletag.display(this.$dfpAdSlots[0].querySelector(this.config.adContainerClass).id);
    };

    /**
     * Asynchronously load the library needed for DFP to work.
     *
     * This was originally loaded in the define funciton at the top, but
     * didn't play well with the unit tests, so it's been moved to here.
     */
    DFP.prototype.loadLibrary = function() {
        var gads   = document.createElement('script'),
            node   = document.getElementsByTagName('script')[0],
            useSSL = 'https:' === document.location.protocol;

        gads.async = true;
        gads.type  = 'text/javascript';
        gads.src   = (useSSL ? 'https:' : 'http:') + this.config.dfpUrl;

        node.parentNode.insertBefore(gads, node);
    };

    DFP.prototype.reload = function() {
        var adsToRefresh = this.adsToRefresh;

        googletag.pubads().refresh(adsToRefresh);
    };

    DFP.prototype.init = function() {
        this.$dfpAdSlots = $(this.config.dfpSelector);

        // If there's no ads on the page, then don't load anything
        if(this.$dfpAdSlots.length === 0) {
            return false;
        }

        window.googletag = window.googletag || { cmd: [] };

        this.loadLibrary();

        try {
            googletag.cmd.push(this.setListeners.bind(this));
            googletag.cmd.push(this.setPageTargetting.bind(this));
            googletag.cmd.push(this.defineSlots.bind(this));
            googletag.cmd.push(this.fireAdRequest.bind(this));
        } catch(e) {
            mediator.emit('module:error', 'DFP ad loading error: ' + e, 'common/modules/adverts/dfp.js');
        }
    };

    return DFP;

});
