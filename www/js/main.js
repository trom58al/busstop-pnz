(function($){
$.cookie.json = true;
String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[number] != 'undefined'
            ? args[number]
            : match
        ;
    });
};

function get_geolocation(callback,accuracy,timeout,age){
    if (navigator.geolocation){
        navigator.geolocation.getCurrentPosition(
            function(position){
                callback.call(null, position.coords);
            },function(error){
                callback.call(null,{error: error});
            },{
                enableHighAccuracy:accuracy || true,
                timeout:timeout || 30000,
                maximumAge:age || 10000
            }
        );
    }else{
        callback.call(null,{error: 'not_supported'});
    }
}

$(document).on("pageinit", "#search", function() {
    var page = $(this);
    var results = $(page.find('.search-results'));
    var didyoumean = $(page.find('.didyoumean'));

    var standalone_ad = $(page.find('.standalone-ad'));
    if(typeof window.navigator.standalone != 'undefined' &&
       !window.navigator.standalone
    ){
        standalone_ad.show();
    }

    var default_list = function(){
        didyoumean.hide();
        get_geolocation(function(c){
            results.load('/?'+ $.param($.extend(c,{favorite:$.totalStorage('favorite') || []})),function(){
                results.listview('refresh');
            })
        });
    };

    var search = $(page.find('.search'))
        .on('textinput',function()
        {
            var query = $(this).val();
            $.get('/search_stations',{q:query},function(data)
            {
                if(data.fixed_query){
                    didyoumean.show()
                        .find('.fixed').html(data.fixed_query);
                }else{
                    didyoumean.hide();
                }
                results.html(data.results).listview('refresh');

                standalone_ad.hide();
                window.yandexMetrika.reachGoal('search',{search_query:query});
            });
        })
        .on('clear',default_list)
    ;
    default_list();
});
$(document).on('pagechange',function(e,v){
    if(typeof v!= 'undefined'){
        v.toPage.trigger('pagechanged');
    }
});
$(document).on("pagechanged", "#forecast", function() {
    var page = $(this);
    var station_id = page.data('station-id');
    var station_name = $(page.find('.station_name')).html();

    var refresh = $(page.find('.refresh'));
    var timeToRefresh = 10;
    if(typeof(window.refreshTimer) != 'undefined'){
        window.refreshTimer.stop();
    }
    window.refreshTimer = $.timer(function(){
        timeToRefresh--;
        if(timeToRefresh == 0){
            refresh.click();
        }else{
            $('.refresh_in').html(timeToRefresh-1);
        }
    },1000,true);

    refresh.click(function(){
        refreshTimer.stop();
        $.mobile.changePage(location.href, {
            allowSamePageTransition:true,
            reloadPage: true,
            changeHash: false
        });
    });

    //there must be a better way ...
    var favorite = $(page.find('.favorite'));
    favorite.data('favorite_handlers',{
        is: function(id){
            return $.inArray(station_id, $.totalStorage('favorite')) != -1;
        },
        set: function(){
            $.totalStorage('favorite',
                $.merge($.totalStorage('favorite') || [],[station_id])
            );
            window.yandexMetrika.reachGoal('favorite',{favorite:station_name});
        },
        unset: function(){
            var favorite_ids = $.totalStorage('favorite');
            delete favorite_ids[favorite_ids.indexOf(station_id)];
            $.totalStorage('favorite',favorite_ids);
        },
        refresh: function(){
            $this = $(this);
            var h = $this.data('favorite_handlers');
            if(h.is()){
                $this
                    .data('icon','minus')
                    .html('Из избранного');
            }else{
                $this
                    .data('icon','plus')
                    .html('В избранное');
            }
            $this.button('refresh');
        }
    })
    .click(function(){
        $this = $(this);
        var h = $this.data('favorite_handlers');
        if(h.is()){
            h.unset();
        }else{
            h.set();
        }
        h.refresh.call($this);
    }).data('favorite_handlers').refresh.call(favorite);

    window.yandexMetrika.reachGoal('forecast',{forecast_query:station_name});
});

$(document).on("pageinit", "#about", function() {
    $($(this).find(".geo-debug"))
    .on('expand',function()
    {
        var that = this;
        get_geolocation(function(){
            var geo_debug = $(that).find('p');
            navigator.geolocation.getCurrentPosition(function(position){
                var c = position.coords;
                var text = '<p>Широта: ' + c.latitude + '</p>'
                         + '<p>Долгота: ' + c.longitude + '</p>';
                text += c.accuracy ? '<p>Точность: ±' + c.accuracy + ' метров</p>' : '';
                text += c.altitude ? '<p>Высота: ' + c.altitude + '</p>' : '';
                text += c.altitudeAccuracy ? '<p>Точность высоты: ±' + c.altitudeAccuracy + ' метров</p>' : '';
                text += c.speed ? '<p>Скорость: ' + c.speed + '</p>' : '';
                text += c.heading ? '<p>Направление: ' + c.heading + '</p>' : '';
                text += c.timestamp ? '<p>Последнее определение: ' + new Date(position.timestamp).toString() + '</p>' : '';
                geo_debug.html(text);
            },null,{enableHighAccuracy:true,timeout:30000,maximumAge:10000});
        });
    });
});

})(jQuery);


