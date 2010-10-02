NEWSBLUR.ReaderFeedchooser = function(options) {
    var defaults = {};
    
    this.options = $.extend({}, defaults, options);
    this.model = NEWSBLUR.AssetModel.reader();
    this.google_favicon_url = 'http://www.google.com/s2/favicons?domain_url=';
    this.runner();
};

NEWSBLUR.ReaderFeedchooser.prototype = {
    
    runner: function() {
        this.start = new Date();
        this.MAX_FEEDS = 40;
        this.approve_list = [];
        this.make_modal();
        this.open_modal();
        this.find_feeds_in_feed_list();
        this.initial_load_feeds();
        
        this.$modal.bind('mousedown', $.rescope(this.handle_click, this));
    },
    
    make_modal: function() {
        var self = this;
        
        this.$modal = $.make('div', { className: 'NB-modal-feedchooser NB-modal' }, [
            $.make('h2', { className: 'NB-modal-title' }, 'Choose Your '+this.MAX_FEEDS),
            $.make('h2', { className: 'NB-modal-subtitle' }, [
                $.make('b', [
                    'You have a ',
                    $.make('span', { style: 'color: #303060;' }, 'Standard Account'),
                    ', which can follow up to '+this.MAX_FEEDS+' sites at a time.'
                ]),
                'You can always switch these.'
            ]),
            $.make('div', { className: 'NB-feedchooser-type'}, [
              $.make('div', { className: 'NB-feedchooser-info'}, [
                  $.make('div', { className: 'NB-feedchooser-info-type' }, [
                        $.make('span', { className: 'NB-feedchooser-subtitle-type-prefix' }, 'Free'),
                        ' Standard Account'
                  ]),
                  $.make('div', { className: 'NB-feedchooser-info-counts'}),
                  $.make('div', { className: 'NB-feedchooser-info-sort'}, 'Auto-Selected By Popularity')
              ]),
              this.make_feeds(),
              $.make('form', { className: 'NB-feedchooser-form' }, [
                  $.make('div', { className: 'NB-modal-submit' }, [
                      // $.make('div', { className: 'NB-modal-submit-or' }, 'or'),
                      $.make('input', { type: 'submit', disabled: 'true', className: 'NB-disabled NB-modal-submit-save NB-modal-submit-green', value: 'Check what you like above...' })
                  ])
              ])
            ]),
            $.make('div', { className: 'NB-feedchooser-type NB-last'}, [
              $.make('div', { className: 'NB-feedchooser-info'}, [
                  $.make('div', { className: 'NB-feedchooser-info-type' }, [
                    $.make('span', { className: 'NB-feedchooser-subtitle-type-prefix' }, 'Super-Mega'),
                    ' Fancy Account'
                  ])
              ]),
              $.make('ul', { className: 'NB-feedchooser-premium-bullets' }, [
                $.make('li', { className: 'NB-feedchooser-premium-cost' }, [
                    
                ]),
                $.make('li', { className: 'NB-feedchooser-premium-cost' }, [
                  $.make('span', { className: 'NB-feedchooser-premium-cost-dollars' }, '$12'),
                  '/',
                  $.make('span', { className: 'NB-feedchooser-premium-cost-time' }, 'year'),
                  '. That\'s a single dollar a month.'
                ])
              ]),
              $.make('form', { className: 'NB-feedchooser-form' }, [
                  $.make('div', { className: 'NB-modal-submit' }, [
                      $.make('input', { type: 'submit', disabled: 'true', className: 'NB-modal-submit-premium NB-modal-submit-green', value: 'Upgrade my account, please!' })
                  ])
              ])
            ])
        ]);
    },
    
    make_feeds: function() {
        var feeds = this.model.feeds;
        
        var $feeds = $('#feed_list').clone(true).attr({
            'id': 'NB-feedchooser-feeds',
            'class': 'NB-feedlist NB-feedchooser unread_view_positive',
            'style': ''
        });
        
        // Expand collapsed folders
        $('ul.folder', $feeds).css({
            'display': 'block',
            'opacity': 1
        });
        
        // Pretend unfetched feeds are fine
        $('.NB-feed-unfetched', $feeds).removeClass('NB-feed-unfetched');
        
        $('.unread_count_positive', $feeds).text('On');
        $('.unread_count_negative', $feeds).text('Off');
        
        return $feeds;
    },
    
    resize_modal: function(previous_height) {
        var height = this.$modal.height() + 24;
        var parent_height = this.$modal.parent().height();
        NEWSBLUR.log(['resize', $('#NB-feedchooser-feeds').height(), height, parent_height]);
        if (height > parent_height && previous_height != height) {
            var chooser_height = $('#NB-feedchooser-feeds').height();
            var diff = Math.max(4, height - parent_height);
            $('#NB-feedchooser-feeds').css({'max-height': chooser_height - diff});
            _.defer(_.bind(function() { this.resize_modal(height); }, this), 1);
        }
    },
    
    open_modal: function() {
        var self = this;
        
        this.$modal.modal({
            'minWidth': 750,
            'maxWidth': 750,
            'overlayClose': true,
            'onOpen': function (dialog) {
                dialog.overlay.fadeIn(200, function () {
                    dialog.container.fadeIn(200);
                    dialog.data.fadeIn(200, function() {
                        _.defer(_.bind(self.resize_modal, self), 10);
                    });
                });
            },
            'onShow': function(dialog) {
                $('#simplemodal-container').corner('6px');
            },
            'onClose': function(dialog) {
                if (!self.approve_list.length) {
                    NEWSBLUR.reader.show_feed_chooser_button();
                }
                dialog.data.hide().empty().remove();
                dialog.container.hide().empty().remove();
                dialog.overlay.fadeOut(200, function() {
                    dialog.overlay.empty().remove();
                    $.modal.close();
                });
                $('.NB-modal-holder').empty().remove();
            }
        });
    },
    
    add_feed_to_decline: function(feed_id, update) {
        this.approve_list = _.without(this.approve_list, feed_id);
        var $feed = this.$feeds[feed_id];
        
        $feed.removeClass('NB-feedchooser-approve');
        $feed.addClass('NB-feedchooser-decline');
        if (update) {
            this.update_counts();
        }
    },
    
    add_feed_to_approve: function(feed_id, update) {
        if (!_.contains(this.approve_list, feed_id)) {
            this.approve_list.push(feed_id);
        }
        var $feed = this.$feeds[feed_id];
        $feed.removeClass('NB-feedchooser-decline');
        $feed.addClass('NB-feedchooser-approve');
        if (update) {
            this.update_counts();
        }
    },
        
    find_feeds_in_feed_list: function() {
        var $feed_list = $('.NB-feedchooser', this.$modal);
        var $feeds = {};
        
        $('.feed', $feed_list).each(function() {
            var feed_id = $(this).data('feed_id');
            if (!(feed_id in $feeds)) {
                $feeds[feed_id] = $([]);
            }
            $feeds[feed_id].push($(this).get(0));
        });
        
        this.$feeds = $feeds;
    },
    
    update_counts: function() {
        var $count = $('.NB-feedchooser-info-counts');
        var approved = this.approve_list.length;
        var $submit = $('.NB-modal-submit-save', this.$modal);
        var difference = approved - this.MAX_FEEDS;
        
        $count.text(approved + '/' + this.MAX_FEEDS);
        $count.toggleClass('NB-full', approved == this.MAX_FEEDS);
        $count.toggleClass('NB-error', approved > this.MAX_FEEDS);
        $('.NB-feedchooser-info-sort', this.$modal).fadeOut(500);
        if (approved > this.MAX_FEEDS) {
          $submit.addClass('NB-disabled').attr('disabled', true).val('Too many sites! Deselect ' + (
            difference == 1 ?
            '1 site...' :
            difference + ' sites...'
          ));
        } else {
          $submit.removeClass('NB-disabled').attr('disabled', false).val('Turn on these '+ approved +' sites, please');
        }
    },
    
    initial_load_feeds: function() {
        var start = new Date();
        var self = this;
        var $feeds = $('.feed', this.$modal);
        var feeds = this.model.get_feeds();
        
        var active_feeds = _.any(_.pluck(feeds, 'active'));
        if (!active_feeds) {
            // Get feed subscribers
            var min_subscribers = _.last(
              _.first(
                _.pluck(this.model.get_feeds(), 'subs').sort(function(a,b) { 
                  return b-a; 
                }), 
                this.MAX_FEEDS
              )
            );
        
            // Decline everything
            var approve_feeds = [];
            _.each(feeds, function(feed, feed_id) {
                self.add_feed_to_decline(parseInt(feed_id, 10));
            
                if (feed['subs'] >= min_subscribers) {
                    approve_feeds.push(parseInt(feed_id, 10));
                }
            });
        
            // Approve feeds in subs
            _.each(approve_feeds, function(feed_id) {
                if (self.model.get_feed(feed_id)['subs'] > min_subscribers &&
                    self.approve_list.length < self.MAX_FEEDS) {
                    self.add_feed_to_approve(feed_id);
                }
            });
            _.each(approve_feeds, function(feed_id) {
                if (self.model.get_feed(feed_id)['subs'] == min_subscribers &&
                    self.approve_list.length < self.MAX_FEEDS) {
                    self.add_feed_to_approve(feed_id);
                }
            });
        } else {
            // Get active feeds
            var active_feeds = _.pluck(_.select(feeds, function(feed) {
                if (feed.active) return true;
            }), 'id');
            this.approve_list = active_feeds;
            
            // Approve or decline
            var feeds = [];
            $feeds.each(function() {
                var feed_id = $(this).data('feed_id');
                
                if (_.contains(active_feeds, feed_id)) {
                    self.add_feed_to_decline(feed_id);
                } else {
                    self.add_feed_to_decline(feed_id);
                }
            });
        }
        this.update_counts();
    },
    
    save: function() {
        var approve_list = this.approve_list;
        var $submit = $('.NB-modal-submit-save', this.$modal);
        $submit.addClass('NB-disabled').val('Saving...');
        
        this.model.save_feed_chooser(approve_list, function() {
            NEWSBLUR.reader.hide_feed_chooser_button();
            NEWSBLUR.reader.load_feeds();
            $.modal.close();
        });
    },
    
    // ===========
    // = Actions =
    // ===========

    handle_click: function(elem, e) {
        var self = this;
        
        $.targetIs(e, { tagSelector: '.feed' }, _.bind(function($t, $p) {
            e.preventDefault();
            
            var feed_id = $t.data('feed_id');
            if (_.contains(this.approve_list, feed_id)) {
                this.add_feed_to_decline(feed_id, true);
            } else {
                this.add_feed_to_approve(feed_id, true);
            }
        }, this));
        
        $.targetIs(e, { tagSelector: '.NB-modal-submit-save' }, _.bind(function($t, $p) {
            e.preventDefault();
            this.save();
        }, this));
    },

    handle_cancel: function() {
        var $cancel = $('.NB-modal-cancel', this.$modal);
        
        $cancel.click(function(e) {
            e.preventDefault();
            $.modal.close();
        });
    }
                
};