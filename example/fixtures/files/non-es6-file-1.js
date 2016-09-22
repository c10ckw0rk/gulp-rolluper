(function($) {

    var $w = $(window);
    var $d = $(document);

    // static constructs
    $.core = $.core || { version: '0.0.1' };

    $.core.popoverMini = {

        // update the default conf values below in $.core.popover.settings
        updateSettings: function (settings) {
            this.settings = $.extend (true, {}, this.settings, settings);
        },
        // settings that control the way this plugin operates (different to the conf values below that are used when the plugin is being applied to an element)
        settings: {
            allowAnimations: false,         // should the mask use animations to fade in and out?
            allowMask: true,                // should the mask use animations to fade in and out?
            zIndex: 10000                   // the start z-index of the popovers
        },

        // update the default conf values below in $.core.popover.conf
        updateDefaultConf: function (conf) {
            this.conf = $.extend (true, {}, this.conf, conf);
        },
        // the default conf values used when this plugin is applied to an element
        conf: {
            template: 'general',
            group: null,

            fixed: false,                               // fix the popover into one position on the screen (fixed positioning not supported by ie6) (overridden to 'mouse' if attachToMouse is true)
            attachToMouse: false,                       // should the popover follow the mouse?
            baseElement: null,                          // an element, 'mouse' or ('screen' / null) (overridden to 'mouse' if attachToMouse is true)

            baseDirX: 0.5,                              // 'left', 'center', 'right', or a number between 0 and 1 (ie. a percentage)
            popoverDirX: 0.5,                           // 'left', 'center', 'right'
            offsetX: 0,                                 // offset in pixels to adjust the starting point
            startOnScreenX: true,                       // position the popover back into the viewable area of the page if it appears initially offscreen X

            baseDirY: 0.5,                              // 'top', 'center', 'bottom', or a number between 0 and 1 (ie. a percentage)
            popoverDirY: 0.5,                           // 'top', 'center', 'bottom'
            offsetY: 0,                                 // offset in pixels to adjust the starting point
            startOnScreenY: true,                       // position the popover back into the viewable area of the page if it appears initially offscreen Y

            width: null,                                // the width of the popover
            minWidth: null,                             // the max-width of the popover
            maxWidth: null,                             // the min-width of the popover

            applyMaskToSelf: false,                     // use the mask on this popover
            applyMask: true,                            // use the mask on this popover's group
            maskOptions: {                              // options controlling the mask
                color: null,
                loadSpeed: 800,
                closeSpeed: 800,
                opacity: 0.7
            },

            applyDraggable: true,                       // turns the dragability on/off (uses jQueryUI)
            dragOptions: {                              // the options passed to the jQueryUI draggable call.  ALL OTHER DRAGGABLE OPTIONS CAN BE SET they will be passed to jQueryUI
                handle: false,                          // default selector to use when finding elements to drag by
                opacity: 0.85,                          // default opacity when dragging
                containment: 'document'                 // restrict movement of the popover to the document's boundaries
            },

            easyClose: true,                            // close the popover by clicking outside or pressing escape
            closeOnClick: null,                         // set to false to manually override
            closeOnEsc: null,                           // set to false to manually override 

            closeAfter: null,                           // close this popover after x milliseconds
            addCloseX: true,                            // add the "closeX" element to the popover (ie. add the "X" button
            closeXHtml: '<a class="core-closeX"></a>',  // the html used for the closeX button

            // events
            onBeforePosition: null,                     // called after the element has been created but before it has been positioned (good for manipulating the content before it is positioned on the screen)
            onBeforeShow: null,
            onShow: null,
            onBeforeClose: null,
            onClose: null
        }
    };

    var instances = {};
    var order = { topLevel: [] };
    var focusedUid = null;
    var setClickCloseTimeout = null;

    var popoverMini = function ($popover, tempConf) {

        // private variables
        var api = this;
        var $popover = $($popover);
        var conf = $.extend (true, {}, tempConf);       // clone the conf
        var $b = $('body:first');

        var uid = Math.random ().toString ().slice (10);

        var opened = false;
        var popoverApisToCloseWhenClosing = [];
        var closeTimeout = null;

        // resolve the base element
        $baseElement = conf.baseElement;
        if ($.inArray ($baseElement, ['mouse', 'screen', null]) < 0)
            var $baseElement = $($baseElement).first ();

        // if animations are off,  turn off mask fade-in/out speed
        if (!$.core.popoverMini.settings.allowAnimations) {
            conf.maskOptions.loadSpeed = 0;
            conf.maskOptions.closeSpeed = 0;
        }

        // if no group was specified then create it's own unique random group
        if (conf.group === null) {
            if (conf.applyMaskToSelf) {
                conf.applyMaskToSelf = false;
                conf.applyMask = true;
            }
            conf.group = Math.random ().toString ().slice (10);
        }






        // mark this element as being a popover
        $popover.addClass ('core-popover');






        // API methods
        $.extend (api, {

            // open (show) the popover
            open: function (e) {

                // can be opened only once
                if (opened)
                    return api;





                // record that this popover is open
                opened = true;





                // onBeforeShow
                e2 = $.Event ();
                e2.type = 'onBeforeShow';
                $popover.trigger (e2);
                if (e2.isDefaultPrevented ()) {
                    e.preventDefault ();
                    return api;
                }





                // make it draggable if required
                if (conf.applyDraggable) {
                    $popover.draggable (conf.dragOptions);

                    // apply the draggable class to only the handles
                    if (conf.dragOptions.handle !== false)
                        $popover.find (conf.dragOptions.handle).addClass ('core-popoverDraggable');
                    // or apply the draggable class to the whole popover
                    else
                        $popover.addClass ('core-popoverDraggable');
                }

                // apply ajax forms
                if ($.core.ajaxForm) {

                    // set the uid inside any ajax forms within the popover
                    // and then activate the ajax forms
                    $popover.find ('.' + $.core.ajaxForm.settings.ajaxFormClass).map (function () {
                        $(this).ajaxForm ();
                        var api = $(this).data ('ajaxForm');
                        if (api)
                            api.setPopoverUid (uid, false);
                    });
                }

                // add the closeX if necessary
                if (conf.addCloseX) {
                    var $close = $(conf.closeXHtml).bind ('click.core-popoverMini-close', function () { api.close (); });
                    $popover.prepend ($close);
                }






                // set the popover's min/max/widths
                // handle ie6's min/max-widths differently
                if (($.browser.msie) && ($.browser.version < 7)) {
                    if (conf.maxWidth)
                        $popover.width (parseInt (conf.maxWidth));
                    if (conf.minWidth)
                        $popover.width (parseInt (conf.minWidth));
                }
                // normal browsers
                else {
                    if (conf.maxWidth)
                        $popover.css ('max-width', parseInt (conf.maxWidth) + 'px');
                    if (conf.minWidth)
                        $popover.css ('min-width', parseInt (conf.minWidth) + 'px');
                }
                if (conf.width) {
                    $popover.width (conf.width);
                }

                // fix the width of the titlebox in <= ie7
                if (($.browser.msie) && ($.browser.version < 8))
                    $popover.show ().find ('.core-titleBox').outerWidth ($popover.width ()).end ().hide ();






                // call the onBeforePosition javascript (before the overlay is applied to the popover)
                e2 = $.Event ();
                e2.type = 'onBeforePosition';
                $popover.trigger (e2);
                if (e2.isDefaultPrevented ()) {
                    e.preventDefault ();
                    return api;
                }






                // position the popover
                var pos = getStartCoordinates ();
                pos = getOnScreenCoordinates (pos.left, pos.top);

                // fixed or absolute positioning? (fixed will keep it stuck in the same spot regardless of scrolling)
                if (((!$.browser.msie) || ($.browser.version >= 7)) && (conf.fixed)) {  // (fixed positioning not supported by ie6)
                    pos.top -= $w.scrollTop ();
                    pos.left -= $w.scrollLeft ();
                    $popover.css ('position', 'fixed');
                }
                else
                    $popover.css ('position', 'absolute');

                $popover.css ({ left: pos.left + 'px', top: pos.top + 'px' } );

                // visually show the popover
                var callBack = function () {

                    // onShow
                    e2 = $.Event ();
                    e2.type = 'onShow';
                    $popover.trigger (e2);

                    // close again after x ms
                    if (conf.closeAfter > 0)
                        api.closeDelayed (conf.closeAfter);
                }
                if ($.core.popoverMini.settings.allowAnimations)
                    $popover.show ('fade', {}, 200, callBack);
                else {
                    $popover.show ();
                    callBack ();
                }












                // add the mask effect if necessary
                if (((conf.applyMaskToSelf) || (conf.applyMask)) && ($.core.popover.settings.allowMask)) {
                    maskConf = $.extend (true, { closeOnClick: false, closeOnEsc: false, loadSpeed: conf.maskOptions.speed }, conf.maskOptions);    // should the mask hide on click / esc-keypress?
                    if (!$.core.popover.settings.maskAnimation)
                        maskConf.loadSpeed = maskConf.closeSpeed = 0;
                    $popover.mask (maskConf);
                }




                // keep the popover attached to the mouse if necessary
                if (conf.attachToMouse) {
                    $b.bind ('mousemove.core-popoverMini' + uid, function (e) {
                        var pos = getStartCoordinates ();
                        pos = getOnScreenCoordinates (pos.left, pos.top);
                        $popover.css ({ left: pos.left + 'px', top: pos.top + 'px' } );
                    });
                }













                return api;
            },

            // close the popover
            close: function (e) {

                if (!opened)
                    return $popover;

                e = e || $.Event ();
                e.type = 'onBeforeClose';
                $popover.trigger (e);
                if (e.isDefaultPrevented ())
                    return;

                opened = false;



                // remove the popover api
                delete instances[uid];  // remove the popover from the internal list of popovers
                order.topLevel.remove (uid);    // remove the popover from the order list

                // and from it's group if necessary
                if (conf.group) {
                    var groupAlias = 'g' + conf.group;  // alter the group's name internally so it doesn't interfere with the popover namespace (ie. the uids)
                    order[groupAlias].remove (uid);
                    if (order[groupAlias].length <= 0) {    // remove the group if it's empty
                        delete order[groupAlias];
                        order.topLevel.remove (groupAlias);
                    }
                }

                // re-apply the popover order and close the mask if necessary
                applyFocusOrder ();

                var callback = function () {
                    e.type = 'onClose';
                    $popover.trigger (e);

                    $popover.remove ();

                    // stop observing mouse movements
                    if (conf.attachToMouse)
                        $b.unbind ('mousemove.core-popoverMini' + uid);
                }

                // visually hide the popover
                if ($.core.popoverMini.settings.allowAnimations)
                    $popover.hide (($.core.popoverMini.settings.allowAnimations ? 'fade' : null), {}, 100, callback);
                else {
                    $popover.hide ().remove ();
                    callback ();
                }

                // close any other associated popovers that need closing
                $.each (popoverApisToCloseWhenClosing, function () { this.close (); });

                return api;
            },

            // close the popover after the given amount of time (in ms)
            closeDelayed: function (delayMS) {
                if (opened) {

                    // cancel any existing closeDelayed timeout
                    api.cancelCloseDelayed ();

                    // start the close delayed process
                    if (delayMS <= 0)
                        api.close ();
                    closeTimeout = setTimeout (function () { api.close (); }, delayMS);
                }
                return api;
            },

            // cancel the popover's delayed closure
            cancelCloseDelayed: function () {
                clearTimeout (closeTimeout);
                return api;
            },

            // add a popover to close when this popover closes
            addPopoverToClose: function (tempApi) {
                if ($.inArray (tempApi, popoverApisToCloseWhenClosing) < 0)
                    popoverApisToCloseWhenClosing.push (tempApi);
                return api;
            },

            // focus the popover,  bringing it to the foreground
            focus: function () {

                // if this popover already has focus,  don't do any more calculations to re-focus it
                if (focusedUid == uid)
                    return api;

                // if this popover is a part of a group then bring that group to the foreground
                if (conf.group) {

                    var groupAlias = 'g' + conf.group;  // alter the group's name internally so it doesn't interfere with the popover namespace (ie. the uids)

                    // bring the group to the top of the list
                    if ($.inArray (groupAlias, order.topLevel) >= 0) {
                        order.topLevel.remove (groupAlias);
                        order.topLevel.push (groupAlias);

                        // bring the popover to the top of the list within the group
                        if (order[groupAlias] !== undefined) {
                            if ($.inArray (uid, order[groupAlias]) >= 0) {
                                order[groupAlias].remove (uid);
                                order[groupAlias].push (uid);
                            }
                        }
                    }
                }
/**
                // or just bring this individual popover to the top of the list
                else {
                    if ($.inArray (uid, order.topLevel) >= 0) {
                        order.topLevel.remove (uid);
                        order.topLevel.push (uid);
                    }
                }
/**/

                applyFocusOrder ();
                return api;
            },

            // create a child popover
            // this is the same as the regular $.createPopover () function but it attaches the new popover to this popover by default (ie. the starting position is based upon the position of this popover)
            // and an association is established between the popovers so that when this (the parent) popover closes,  the child will too
            // and the new popover is put into the same group is this popover
            createChildPopover: function (substitutionValues, tempConf) {

                tempConf = $.extend (true, {}, { attachTo: api.getPopover (), group: conf.group, popoverFunction: null }, tempConf);
                if (!$.isFunction (tempConf.popoverFunction))
                    tempConf.popoverFunction = $.createPopoverMini;

                var $tempPopover = tempConf.popoverFunction (substitutionValues, tempConf);
                api.addPopoverToClose ($tempPopover.data ('popoverMini'));

                return $tempPopover;
            },

            // create a sibling popover
            // this is the same as the regular $.createPopover () function but it attaches the new popover to this popover by default (ie. the starting position is based upon the position of this popover)
            // and the new popover is put into the same group is this popover
            createSiblingPopover: function (substitutionValues, tempConf) {
                tempConf = $.extend (true, {}, { attachTo: api.getPopover (), group: conf.group, popoverFunction: null }, tempConf);
                if (!$.isFunction (tempConf.popoverFunction))
                    tempConf.popoverFunction = $.createPopoverMini;

                var $tempPopover = tempConf.popoverFunction (substitutionValues, tempConf);
                return $tempPopover;
            },









            // replace the contents of the contentBox in this popover
            replaceContentBoxHtml: function (html, ifhKey, ifhPage) {
                var $contentBlock = $popover.find ('.core-contentBox');
                if ($contentBlock.length) {

                    // replace the ifh block with the new content (if new content was specified)
                    // convert the ids of the elements in the new html
//                  var $newContentBlock = api.convertElementIds ('<div class="' + $.core.ajaxForm.settings.ifhBlockClass + '">' + html + '</div>');
                    var $newContentBlock = $('<div class="' + $.core.ajaxForm.settings.ifhBlockClass + '">' + html + '</div>');

//                  existingMessageElementIds = [];
//                  visibleMessageElementIds = [];
//                  messageIdsToAppearThisTime = [];
//                  newMessages = [];

                    // set the uid inside any ajax forms within the popover
                    // and then activate them
                    if ($.fn.ajaxForm !== undefined) {
                        $newContentBlock.find ('.' + $.core.ajaxForm.settings.ajaxFormClass).map (function () {
                            $(this).ajaxForm ();
                            var ajaxFormApi = $(this).data ('ajaxForm');
                            if (ajaxFormApi)
                                ajaxFormApi.setPopoverUid (uid, false).setIfhKey (ifhKey).setIfhPage (ifhPage);
                        });
                    }
// CHECK THIS
// move this jsMessage initialisation into the ajaxForm api
//                  $newContentBlock.find ('.' + $.core.ajaxForm.settings.ajaxFormClass).ajaxForm ().data ('ajaxForm').set_popover_uid (uid).end ().find ('.jsMessage').css ('display', 'none').addClass ('message').html ('').map (function () { existingMessageElementIds.push ($(this).attr ('id')); });
//                  $popover.find ('.' + $.core.ajaxForm.settings.ajaxFormClass).ajaxForm ();
//alert ($('<div/>').html ($newContentBlock.html ()).html ());
                    // replace the content
                    $contentBlock.html ($newContentBlock);

                    // set the flag so that the block can be shown nicely and the popover repositioned when the whole ajax response has been processed
//                  needToShowNewContentBlock = true;
                }
                return api;
            },
/**
            showNewContentBox: function () {

                var $newContentBox = $popover.find ('.core-contentBox').find ('div').eq (0);

                // reposition the popover if necessary
                var originalOffset = $popover.offset ();
                var newOffset = originalOffset;

                // make the popover appear in the best starting spot (the dimension change of the popover may have changed this)
                if (conf.recalculateStartPositionAfterAjax)
                    newOffset = api.getStartCoordinates ($popover.width (), $popover.height ());

                // make sure the popover appears on the page's viewable area if necessary
                newOffset = api.getOnScreenCoordinates ($popover.width (), $popover.height (), newOffset.left, newOffset.top);

                // the 'show' and the 'position animation' happen as two separate concurrent things,  can this happen as one action to smoothe the animation?
                $newContentBox.hide ();
                if ((originalOffset.left != newOffset.left) || (originalOffset.top != newOffset.top))
                    $popover.animate ({ left: '-=' + (originalOffset.left - newOffset.left), top: '-=' + (originalOffset.top - newOffset.top) });

                $newContentBox.show (($.core.popover.settings.popoverAnimations) ? 'blind' : null);

                setTimeout (api.positionArrows, 400);   // re-position the arrows if necessary

                needToShowNewContentBlock = false;
                return api;
            },
/**/







            // return the popover element
            getPopover: function () {
                return $popover;
            },

            // return whether the popover has been opened or not
            isOpened: function () {
                return opened;
            },

            // manipulate start, finish and speeds
            getConf: function () {
                return conf;
            },

            // get the uid
            getUid: function () {
                return uid;
            }
        });







        // private methods


















        // determine the best onscreen position for this popover
        // use the given popover width/height,  or if empty then use the popover's actual width/height
        var getStartCoordinates = function (width, height) {

            // determine the popover's dimensions
            if (width === undefined)
                width = $popover.outerWidth ();
            if (height === undefined)
                height = $popover.outerHeight ();

            // position the overlay in relation to the given element
            // if more than one is found it'll use the first one
            var baseOffset = null;
            if ($baseElement != null) {
                if ($baseElement == 'mouse') {
                    baseOffset = { left: $.core.mouseX ? $.core.mouseX : 0, top: $.core.mouseY ? $.core.mouseY : 0 };   // the offset to the top/left of the mouse position
                    var baseWidth = 16; // assume a 16 x 16 pixel mouse cursor
                    var baseHeight = 16;
                }
                else if ($baseElement) {
                    baseOffset = $baseElement.offset ();    // the offset to the top/left of the baseElement element
                    var baseWidth = $baseElement.outerWidth ();
                    var baseHeight = $baseElement.outerHeight ();
                }
            }
            // if necessary,  position the overlay in relation to the screen
            if (baseOffset === null) {
                var baseOffset = { top: $w.scrollTop (), left: $w.scrollLeft () };  // the offset to the top/left of the document's viewable area
                var baseWidth = $w.width ();
                var baseHeight = $w.height ();
            }




            // adjust x
            var left = 0;
            // percentage
            if (is_float (conf.baseDirX))
                left = baseOffset.left + (baseWidth * conf.baseDirX);
            // or position
            else {
                switch (conf.baseDirX) {
                    case 'left': left = baseOffset.left;    break;
                    case 'right': left = baseOffset.left + baseWidth;   break;
                    default: left = baseOffset.left + (baseWidth / 2);  break;  // 'center'
                }
            }
            // percentage
            if (is_float (conf.popoverDirX))
                left -= width * conf.popoverDirX;
            // or position
            else {
                switch (conf.popoverDirX) {
                    case 'left': left -= 0; break;
                    case 'right': left -= width;    break;
                    default: left -= (width / 2);   break;  // 'center'
                }
            }
            left += conf.offsetX;




            // adjust y
            var top = 0;
            // percentage
            if (is_float (conf.baseDirY))
                top = baseOffset.top + (baseHeight * conf.baseDirY);
            // or position
            else {
                switch (conf.baseDirY) {
                    case 'top': top = baseOffset.top;   break;
                    case 'center': top = baseOffset.top + baseHeight / 2;   break;
                    case 'bottom': top = baseOffset.top + baseHeight;   break;
                }
            }
            // percentage
            if (is_float (conf.popoverDirY))
                top -= height * conf.popoverDirY;
            // or position
            else {
                switch (conf.popoverDirY) {
                    case 'top': top -= 0;   break;
                    case 'center': top -= height / 2;   break;
                    case 'bottom': top -= height;   break;
                }
            }
            top += conf.offsetY;

//          return api.getOnScreenCoordinates (width, height, left, top);
            return { top: parseInt (top), left: parseInt (left) };
        };

        // determine the best onscreen position for this popover
        // use the given popover width/height,  or if empty then use the popover's actual width/height
        // use the given top/left offsets,  or if empty then use the popover's actual top/left
        var getOnScreenCoordinates = function (left, top, width, height) {

            // determine the popover's position
            var offset = $popover.offset ();    // the offset to the top/left of the popover
            if (left === undefined)
                left = offset.left;
            if (top === undefined)
                top = offset.top;

            // determine the popover's dimensions
            if (width === undefined)
                width = $popover.outerWidth ();
            if (height === undefined)
                height = $popover.outerHeight ();

            // adjust x
            // make sure the overlay won't appear off the screen
            if (conf.startOnScreenX) {
                var pageRight = $w.scrollLeft () + $w.width ();
                // not too far right
                if (left + width > pageRight)
                    left = pageRight - width;
                // not too far left
                if (left < $w.scrollLeft ())
                    left = $w.scrollLeft ();
            }

            // adjust y
            // make sure the overlay won't appear off the screen
            if (conf.startOnScreenY) {
                var pageBottom = $w.scrollTop () + $w.height ();

                // not too far down
                if (top + height > pageBottom)
                    top = pageBottom - height;
                // not too far up
                if (top < $w.scrollTop ())
                    top = $w.scrollTop ();
            }

            return { top: top, left: left };
        };
















        // private functions

        // give the popovers according to the current order of popovers in the 'order' object of arrays
        var applyFocusOrder = function () {
/**
            // push the special 'toolTip' and 'helper' group to the top
            $.each (['ghelper','gtoolTip'], function (i, groupAlias) {
                if ($.inArray (groupAlias, order.topLevel) >= 0) {
                    order.topLevel.remove (groupAlias);
                    order.topLevel.push (groupAlias);
                }
            });
/**/

            // generate a flat list of the popovers in increasing desired z-index order
            // loop through the 'topLevel' popover group's order
            var uids = [];
            var groupUidMaskInfo = {};
            for (var count = 0; count < order.topLevel.length; count++) {

                // loop through this popover group's order
                var group = order.topLevel[count];
                for (var count2 = 0; count2 < order[group].length; count2++) {
                    if (instances[order[group][count2]] !== undefined) {
                        uids.push (order[group][count2]);

                        // if this particular popover wants the mask to be applied to it's group and no other popover in it's group has applied the mask to the group,  record this popover as being the one to look for for this group's mask details
                        if ((groupUidMaskInfo[group] === undefined) && (instances[order[group][count2]].getConf ().applyMask))
                            groupUidMaskInfo[group] = order[group][count2];
                    }
                }
            }

            // loop through the popovers now that they're in order,  and work out which one (popover or group) is the top-most one that requires a mask
            var topUidWithMask = null;
            var topGroupWithMask = null;
            for (var count = 0; count < uids.length; count++) {

                // if this popover has a mask then record it's uid
                var tempConf = $.extend (true, {}, instances[uids[count]].getConf ());
                if (tempConf.applyMaskToSelf) {
                    topUidWithMask = uids[count];
                    topGroupWithMask = tempConf.group;
                }

                // otherwise,  if this popover wants to apply the mask to it's group record this popover's group
                else if ((tempConf.group != null) && (tempConf.applyMask)) {
                    if (tempConf.group != topGroupWithMask) {
                        topUidWithMask = null;
                        topGroupWithMask = tempConf.group;
                    }
                }
            }
            // if an individual popover is at the top then forget about the top group
            if (topUidWithMask != null)
                topGroupWithMask = null;

            // if it's a group at the top,  find the back-most popover
            if (topGroupWithMask != null) {
                var groupAlias = 'g' + topGroupWithMask;    // alter the group's name internally so it doesn't interfere with the popover namespace (ie. the uids)
                topUidWithMask = order[groupAlias][0];
            }




            // apply the z-indexes to the popovers and mask
            var zIndex = $.core.popover.settings.zIndex;    // start at the z-index number stated by the settings
            var topUid = null;
            var focusUid = null;
            for (var count = 0; count < uids.length; count++) {

                if (($.core.popover.settings.allowMask) && (uids[count] == topUidWithMask))
                    $('#exposeMask').css ('z-index', zIndex++);
                instances[uids[count]].getPopover ().css ('z-index', zIndex++).removeClass ('core-popoverFocused');

                topUid = uids[count];
                if ($.inArray (instances[uids[count]].getConf ().group, ['toolTip', 'helper']) < 0)
                    focusUid = uids[count];
            }
            if (focusUid)
                instances[focusUid].getPopover ().addClass ('core-popoverFocused');

            // record that this popover is focused so that the focus calculations don't need to run next time this popover is clicked
            focusedUid = topUid;

            // close the mask if necessary
            if (($.core.popover.settings.allowMask) && (topUidWithMask == null) && ($.mask.isLoaded ()))
                $.mask.close ();

            



            // handle the easyClose events (click outside the popover + esc-keypress)
            $d.unbind ('click.core-popoverMini');
            $d.unbind ('keydown.core-popoverMini');
            if (instances[topUid] != null) {

                var tempConf = instances[topUid].getConf ();

                // when window is clicked outside overlay, close the popover
                if ((tempConf.closeOnClick)
                || ((tempConf.closeOnClick === null) && (tempConf.easyClose))) {
                    var tempApi = instances[topUid];
                    setClickCloseTimeout = setTimeout (function () {    // stop the popover from closing straight away if the user clicked something to make this appear
                        $d.unbind ('click.core-popoverMini');
                        $d.bind ('click.core-popoverMini', function (e) {
                            if (!$(e.target).parents ('.core-popover').length)  // .core_popover
                                tempApi.close (e);
                        });
                    }, 1);
                }

                // keyboard::escape
                // one callback is enough if multiple instances are loaded simultaneously
                if ((tempConf.closeOnEsc)
                || ((tempConf.closeOnEsc === null) && (tempConf.easyClose))) {
                    var tempApi = instances[topUid];
                    $d.one ('keydown.core-popoverMini', function (e) {
                        if (e.keyCode == 27)
                            tempApi.close (e);
                    });
                }
            }

            return api;
        };

        // add this popover to the popover order list so it can be ordered
        var addThisPopoverToInstances = function () {

            instances[uid] = api;   // add this popover to the list

            // add this popover to the list
            // a popover that's in a group
            // create an order array for the group,  and place that group inside the 'topLevel' order array
            var groupAlias = 'g' + conf.group;  // alter the group's name internally so it doesn't interfere with the popover namespace (ie. the uids)
            order[groupAlias] = order[groupAlias] || [];
            order[groupAlias].push (uid);

            if ($.inArray (groupAlias, order.topLevel) < 0)
                order.topLevel.push (groupAlias);

            // bring this group to the front
            order.topLevel.remove (groupAlias);
            order.topLevel.push (groupAlias);

            // give the popovers their respective z-indexes
            applyFocusOrder ();

            return api;
        };

        // assign the callbacks
        $.each (['onBeforePosition', 'onBeforeShow', 'onShow', 'onBeforeClose', 'onClose'], function (i, name) {

            // configuration
            if ($.isFunction (conf[name]))
                $popover.bind (name, conf[name]);

            // API
            $popover[name] = function (fn) {
                $popover.bind (name, fn);
                return $popover;
            };
        });

        // initialise the popover
        var init = function () {

            // add this popover to the popover order list so it can be ordered
            addThisPopoverToInstances ();

            // make it so that when this popover is clicked,  it will be brought into focus
            $popover.mousedown (api.focus);
        };



        // show the popover
        init ();
    };

    // jQuery plugin initialisation
    $.fn.popoverMini = function (conf) {

        // merge the caller's conf with the default conf
        conf = $.extend (true, {}, $.core.popoverMini.conf, conf);

        // if the popover is to be attached to the mouse..
        if (conf.attachToMouse) {
            conf.fixed = false;         // make sure it isn't set into a "fixed" position because this causes position problems when scrolling
            conf.baseElement = 'mouse'; // make it's start position where the mouse is
        }

        // turn each selected element into a popover
        $(this).each (function () {

            var $this = $(this);

            // only apply the popover to this element if it hasn't already been applied
            if (!$this.data ('popoverMini')) {

                var api = new popoverMini ($this, conf);    // turn this element into a popover
                $this.data ('popoverMini', api);            // record the api within this element for later
                api.open ();                                // show the popover
            }
        });

        return this;
    };











    // create a new popover (create a dom element and turn it into an overlay)
    $.createPopoverMini = function (substitutionValues, conf) {

        // apply the default template if not specified
        conf = $.extend (true, {}, { template: $.core.popoverMini.conf.template }, conf);

        // first make sure the template exists
        if ($.popoverTemplates[conf.template] !== undefined) {

            // grab the template
            var template = $.popoverTemplates[conf.template];


            // apply this template's default options
            conf = $.extend (true, {}, template.conf, conf);

            // apply the default dialogue popover options
            conf = $.extend (true, {}, $.core.popover.dialogueConf, conf);


            // generate the html
            // apply the relevant substitutions
            substitutionValues = $.extend ({}, substitutionValues);
            var html = template.html;
            $(template.substitutionNames).each (function (index, value) {
                html = html.replace ('%%' + value + '%%', (substitutionValues[value] || ''));
            });

            // create the popover element based on the html,
            // and attach the popover element to the page
            // make it appear
            // return it
            return $(html).appendTo ($('body')).popoverMini (conf);
        }
        return null;
    };

}) (jQuery);




/**
jQuery ().ready ((function ($) {
    return function () {
        setTimeout (function () {
            $.createPopoverMini (
            { title: 'helo', content: 'there oaehtulrens hnsoeh sch,scrh.usnhc,.snht snoeha ntehaostn uhsaeou oae' },
            {   baseElement: '#locationTerm'
//              attachToMouse: true,
//              minWidth: 700
            });
        }
        , 1000);
    }
}) (jQuery));
/**/
