(function($) {
    // Cache commonly used DOM elements
    var $window = $(window),
        $head = $('head'),
        $body = $('body');

    // Define breakpoints
    breakpoints({
        xlarge: ['1281px', '1680px'],
        large: ['981px', '1280px'],
        medium: ['737px', '980px'],
        small: ['481px', '736px'],
        xsmall: ['361px', '480px'],
        xxsmall: [null, '360px'],
        'xlarge-to-max': '(min-width: 1681px)',
        'small-to-xlarge': '(min-width: 481px) and (max-width: 1680px)'
    });

    // Handle page load events
    $window.on('load', function() {
        setTimeout(function() {
            $body.removeClass('is-preload');
        }, 100);
    });

    // Handle window resize events
    var resizeTimeout;
    $window.on('resize', function() {
        $body.addClass('is-resizing');
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            $body.removeClass('is-resizing');
        }, 100);
    });

    // Fix for object-fit images on browsers that don't support it
    if (!browser.canUse('object-fit') || browser.name == 'safari') {
        $('.image.object').each(function() {
            var $this = $(this),
                $img = $this.children('img');

            // Hide original image
            $img.css('opacity', '0');

            // Set background image and styles
            $this.css('background-image', 'url("' + $img.attr('src') + '")')
                .css('background-size', $img.css('object-fit') || 'cover')
                .css('background-position', $img.css('object-position') || 'center');
        });
    }

    // Sidebar behavior
    var $sidebar = $('#sidebar'),
        $sidebar_inner = $sidebar.children('.inner');

    // Sidebar inactive on smaller screens
    breakpoints.on('<=large', function() {
        $sidebar.addClass('inactive');
    });

    breakpoints.on('>large', function() {
        $sidebar.removeClass('inactive');
    });

    // Workaround for Chrome/Android scrollbar issue
    if (browser.os == 'android' && browser.name == 'chrome') {
        $('<style>#sidebar .inner::-webkit-scrollbar { display: none; }</style>')
            .appendTo($head);
    }

    // Sidebar toggle
    $('<a href="#sidebar" class="toggle">Toggle</a>')
        .appendTo($sidebar)
        .on('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            $sidebar.toggleClass('inactive');
        });

    // Sidebar link click handling
    $sidebar.on('click', 'a', function(event) {
        if (breakpoints.active('>large')) return;

        var $a = $(this),
            href = $a.attr('href'),
            target = $a.attr('target');

        event.preventDefault();
        event.stopPropagation();

        if (!href || href === '#' || href === '') return;

        $sidebar.addClass('inactive');

        setTimeout(function() {
            if (target === '_blank') window.open(href);
            else window.location.href = href;
        }, 500);
    });

    // Prevent event bubbling inside sidebar panel
    $sidebar.on('click touchend touchstart touchmove', function(event) {
        if (breakpoints.active('>large')) return;
        event.stopPropagation();
    });

    // Close sidebar on body click/tap
    $body.on('click touchend', function(event) {
        if (breakpoints.active('>large')) return;
        $sidebar.addClass('inactive');
    });

    // Sidebar scroll lock
    $window.on('load.sidebar-lock', function() {
        var sh, wh, st;

        if ($window.scrollTop() === 1) $window.scrollTop(0);

        $window.on('scroll.sidebar-lock', function() {
            if (breakpoints.active('<=large')) {
                $sidebar_inner.data('locked', 0).css('position', '').css('top', '');
                return;
            }

            var x = Math.max(sh - wh, 0),
                y = Math.max(0, $window.scrollTop() - x);

            if ($sidebar_inner.data('locked') === 1) {
                if (y <= 0)
                    $sidebar_inner.data('locked', 0).css('position', '').css('top', '');
                else
                    $sidebar_inner.css('top', -1 * x);
            } else {
                if (y > 0)
                    $sidebar_inner.data('locked', 1).css('position', 'fixed').css('top', -1 * x);
            }
        }).on('resize.sidebar-lock', function() {
            wh = $window.height();
            sh = $sidebar_inner.outerHeight() + 30;
            $window.trigger('scroll.sidebar-lock');
        }).trigger('resize.sidebar-lock');
    });

    // Menu openers
    var $menu = $('#menu'),
        $menu_openers = $menu.children('ul').find('.opener');

    $menu_openers.each(function() {
        var $this = $(this);

        $this.on('click', function(event) {
            event.preventDefault();
            $menu_openers.not($this).removeClass('active');
            $this.toggleClass('active');
            $window.triggerHandler('resize.sidebar-lock');
        });
    });
})(jQuery);

// Fetch RSS feed function
async function fetchRSS() {
    const rssUrl = "https://ritible.com/profile/aashutosh/feed/gn";
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
        const data = await response.json();

        console.log("Total RSS items fetched: ", data.items.length);
        let html = "";

        const itemsToShow = data.items.slice(0, 50); // Limit to 50 items
        itemsToShow.forEach(item => {
            console.log(item); // Debugging: Check available fields

            // Try different sources for the thumbnail
            let imageUrl = item.thumbnail || (item.enclosure ? item.enclosure.link : "") || "";

            // If no direct thumbnail, extract from content
            if (!imageUrl && item.content) {
                const imgMatch = item.content.match(/<img.*?src="(.*?)"/);
                if (imgMatch) {
                    imageUrl = imgMatch[1];
                }
            }

            // Fallback image
            if (!imageUrl) {
                imageUrl = "altimg.jpg";
            }

            const postDate = new Date(item.pubDate);
            const formattedDate = postDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });

            html += `
                <div class="rss-item">
                    <div class="rss-image">
                        <img src="${imageUrl}" alt="${item.title}">
                    </div>
                    <div class="rss-content">
                        <h3>${item.title}</h3>
                        <p class="rss-date">${formattedDate}</p>
                        <a href="${item.link}" target="_blank" class="button big">Read More</a>
                    </div>
                </div>
            `;
        });

        const blogContainer = document.getElementById("blog-container");
        if (blogContainer) {
            blogContainer.innerHTML = html;
        } else {
            console.error("Element with ID 'blog-container' not found.");
        }
    } catch (error) {
        console.error("Error fetching RSS feed:", error);
    }
}

document.addEventListener("DOMContentLoaded", fetchRSS);
