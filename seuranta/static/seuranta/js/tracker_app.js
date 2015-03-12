var clock = ServerClock({url: '/api/time'});
var competitionSelectionChoice = null;
var competitorSelectionChoice = null;
var watchPositionId = null;
var isGpsSwitchedOn = false;

var setStatus = function(message, type){
    $("#app-status").text(message);
    if(type != "success" && type != "info" && type != "warning" && type != "danger"){
        type = "info";
    }
    $("#app-status")
    .removeClass("alert-success alert-info alert-warning alert-danger")
    .addClass("alert-"+type);
};

var getServerUrl = function(){
    return '/';
};

var setCompetitionList = function(data){
    $.jStorage.set('competition-list', data);
};

var getCompetitionList = function(){
    return $.jStorage.get('competition-list', []);
};

var setCompetitorList = function(data){
    $.jStorage.set('competitor-list', data);
};

var getCompetitorList = function(){
    return $.jStorage.get('competitor-list', []);
};

var setCompetitionDetail = function(competition){
    $.jStorage.set('competition-id', competition.id);
    $.jStorage.set('competition-name', competition.name);
    $.jStorage.set('competition-live_delay', competition.live_delay);
};

var getCompetitionDetail = function(){
    return {
        id: $.jStorage.get('competition-id', null),
        name: $.jStorage.get('competition-name', null),
        live_delay: $.jStorage.get('competition-live_delay', 30)
    };
};

var setCompetitorDetail = function(competitor){
    $.jStorage.set('competitor-id', competitor.id);
    $.jStorage.set('competitor-name', competitor.name);
    $.jStorage.set('competitor-token', competitor.token);
};

var getCompetitorDetail = function(){
    return {
        id: $.jStorage.get('competitor-id', null),
        name: $.jStorage.get('competitor-name', null),
        token: $.jStorage.get('competitor-token', null)
    }
};

var fetchCompetitionList = function(url){
    setStatus('Fetch competition List');
    url = url || getServerUrl()+"api/competition";
    $.ajax({
        url: url,
        data: {
            status: ['live', 'upcoming'],
            reverse_order: 'true',
            result_per_page: 1000
        }
    }).success(function(response){
        var results;
        if(response.previous === null){
            results = []
        }else{
            results = getCompetitionList()
        }
        results = results.concat(response.results)
        setCompetitionList(results);
        if(response.next===null){
            setStatus('Competition list fetched', 'success');
            displayCompetitionList();
        } else {
            fetchCompetitionList(response.next);
        }
    }).error(function(){
        setStatus('Error fetching the competition list', 'danger');
    });
};

var fetchCompetitorList = function(url){
    setStatus('Fetch competitor List');
    competition = competitionSelectionChoice;
    url = url || getServerUrl()+"api/competitor";
    $.ajax({
        url: url,
        data: {
            competition_id: competition.id,
            result_per_page: 1000
        }
    }).success(function(response){
        var results;
        if(response.previous === null){
            results = []
        }else{
            results = getCompetitorList()
        }
        results = results.concat(response.results)
        setCompetitorList(results);
        if(response.next===null){
            setStatus('Competitor list fetched', 'success');
            displayCompetitorList();
        } else {
            fetchCompetitorList(response.next);
        }
    }).error(function(){
        setStatus('Error fetching the competitor list', 'danger');
    });
};

var displayCompetitionList = function(){
    var competitions = getCompetitionList();
    $('#competition-list').html('')
    if(competitions.length===0){
        $('#competition-list').append($('<p class="alert alert-warning">No competitions are available</p>'));
        return;
    }
    $('#competition-list').append('<table class="table table-striped"/>')
    $.each(competitions, function(ii, competition){
        var link = $('<td><a href="#">'+competition.name+'</a></td>');
        link.on('click', function(){
            competitionSelectionChoice = competition;
            fetchCompetitorList();
            $('.select-competitor-pane').hide();
            $('#select-competitor-pane-2').show();
        })
        $('#competition-list > table').append($('<tr/>').append(link));
    });
};

var displayCompetitorList = function(){
    var competitors = getCompetitorList();
    $('#competitor-list').html('')
    if(competitors.length===0){
        $('#competitor-list').append($('<p class="alert alert-warning">No competitors are available</p>'));
        return;
    }
    $('#competitor-list').append('<table class="table table-striped"/>')
    $.each(competitors, function(ii, competitor){
        var link = $('<td><a href="#">'+competitor.name+'</a></td>');
        link.on('click', function(){
            competitorSelectionChoice = competitor;
            $('.select-competitor-pane').hide();
            $('.error-message').hide();
            $('#access-code-input').val('');
            $('#select-competitor-pane-3').show();
        })
        $('#competitor-list > table').append($('<tr/>').append(link));
    });
};

var isCompetitorSet = function(){
    var competition = getCompetitionDetail();
    var competitor = getCompetitorDetail();
    return (competition.id !== null || competitor.id !== null);
};

var displayCompetitor = function(){
    if(!isCompetitorSet()){
        $("#competitor-info").text("No competitor selected")
        .removeClass('alert-success')
        .addClass('alert-warning');
        return;
    }
    var competition = getCompetitionDetail();
    var competitor = getCompetitorDetail();
    $("#competitor-info")
    .text('"'+ competitor.name +'" in competition "'+ competition.name + '"')
    .removeClass('alert-warning')
    .addClass('alert-success');
    $('#start-btn').removeClass('disabled');
    $('#schedule-start-btn').removeClass('disabled');
};

var validateAccessCode = function(){
    var accessCode = $('#access-code-input').val();
    if(accessCode==""){
        $('#access-code-errors')
        .text('Access code can not be blank.')
        .show();
        return
    }
    var competitorId = competitorSelectionChoice.id;
    var url = getServerUrl() + 'api/competitor_token/obtain';
    setStatus('Fetching competitor token');
    $.ajax({
        url: url,
        data: {
            competitor: competitorId,
            access_code: accessCode
        },
        type: 'POST'
    }).success(function(response){
        setStatus('Competitor token fetched', 'success');
        competitorSelectionChoice.token = response.token;
        setCompetitorDetail(competitorSelectionChoice);
        setCompetitionDetail(competitionSelectionChoice);
        displayCompetitor();
        $('#select-competitor-modal').modal('hide');
        $('.select-competitor-pane').hide();
        $('#select-competitor-pane-1').show();
    }).error(function(){
        setStatus('Failed to fetch competitor token', 'danger');
        $('#access-code-errors')
        .text('Access code did not match selected competitor')
        .show();
    });
};

var onPressStart = function(){
    if(!isCompetitorSet()){
        return;
    }
    console.log('start');
    $('#streaming-modal').modal('show');
    startStreaming();
};

var startStreaming = function(){
    isGpsSwitchedOn = true;
    watchPositionId = navigator.geolocation.watchPosition(
        onPositionUpdate,
        onPositionError,
        {
            enableHighAccuracy:true,
            timeout:999,
            maximumAge:1000
        }
    );
    (function positionRequestor(){
        navigator.geolocation.getCurrentPosition(
            onPositionUpdate,
            onPositionError,
            {
                enableHighAccuracy:true,
                timeout:999,
                maximumAge:1000
            }
        );
        if(isGpsSwitchedOn){
            setTimeout(positionRequestor, 1e3);
        }
    })();

    (function positionArchivePusher(){
        pushPositionArchive();
        if(isGpsSwitchedOn){
            setTimeout(positionArchivePusher, 1e3);
        }
    })();
};

var pushPositionArchive = function(force){
    force = force || false;
    // Push data when Archive max age == competition delay -5s
};

var stopStreaming = function(){
    isGpsSwitchedOn = false;
    pushPositionArchive(true);
    navigator.geolocation.clearWatch(watchPositionId);
    $('#streaming-modal').modal('hide');
}

var onPositionUpdate = function(position){
    console.log(position)
}

var onPositionError = function(){
    console.log("position erro")
}

$(function() {
    $('.error-message').hide();
    fetchCompetitionList();
    displayCompetitor();
    $('#select-competitor-btn').on('click', function(){
        $('.select-competitor-pane').hide();
        $('#select-competitor-pane-1').show();
    });
    $('#back-pane-btn-1').on('click', function(){
        $('.select-competitor-pane').hide();
        $('#select-competitor-pane-1').show();
    });
    $('#back-pane-btn-2').on('click', function(){
        $('.select-competitor-pane').hide();
        $('.error-message').hide();
        $('#select-competitor-pane-2').show();
    });
    $('#validate-access-code-btn')
    .on('click', function(e){
      e.preventDefault();
      validateAccessCode();
    });
    $('#start-btn')
    .on('click', function(e){
      e.preventDefault();
      onPressStart();
    });
    $('#refresh-competition-list-btn')
    .on('click', function(e){
      e.preventDefault();
      fetchCompetitionList();
    });
    $('#refresh-competitor-list-btn')
    .on('click', function(e){
      e.preventDefault();
      fetchCompetitorList();
    });
    $('#stop-streaming-btn')
    .on('click',  function(e){
      e.preventDefault();
      stopStreaming();
    });
});