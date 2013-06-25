var appAlert = function(mssg) {
  alert(mssg);
}

var error = function(mssg, trace) {
  appAlert(mssg);
  console.error({'message': mssg, 'trace': trace});
  throw new Error(mssg);
}

function ajaxFailHandler(jqxhr, textStatus, err) {
  error("Request failed: " + textStatus + ', ' + err,
    {'jqxhr' : jqxhr, 'textStatus' : textStatus, 'error' : err});
}


/**
 * Create an object from the query parameters of the given URL.
 * @param url
 * @returns {object}
 * 
 * Example:
 *   var params = getQueryParams("http://example.com/page?color=red");
 *   alert(params.color);
 */
function getQueryParams(url) {
  var i;
  if ((i = url.indexOf('?')) < 0) {
    return {};
  }
  var params = {};
  url.substr(i+1).split('&').forEach(function(s) {
    var a = s.split('=');
    params[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
  });
  return params;
}

var QUERY_PARAMS = getQueryParams(document.URL);


var HackTaskAggregator = function(projectDefs) {
  
  var self = this;
  
  self.view = new ViewModel();
  ko.applyBindings(self.view);
  
  /* change appAlert() to display alert on page rather than a pop-up */
  appAlert = self.view.alert;
  
  projectDefs.forEach(function(projectDef) {
    new QueryProjectGitHub(projectDef)
    .query(function(projectInfo) {
      self.view.projects.push(projectInfo);      
    });
  });
  
};


var QueryProjectGitHub = function(repo) {
  
  var DEFAULT_LABEL = "hack";
  var ALL_LABEL = "*";
  
  var self = this;
  
  if (! repo.owner) {
    error("Error in repository definition: required parameter \"owner\" not defined", {'repo' : repo});
  }
  self.owner = repo.owner;
  
  if (! repo.project) {
    error("Error in repository defintion: required parameter \"project\" not defined", {'repo' : repo});
  }
  self.project = repo.project;
  
  self.label = repo.label || DEFAULT_LABEL;
  if (self.label == ALL_LABEL) {
    self.label = undefined;
  }
  
  self.baseURL = "https://api.github.com/repos/" + encodeURIComponent(self.owner) + "/" + encodeURIComponent(self.project);
  
  self.buildURL = function(path, params) {
    if (! params) {
      params = {};
    }
    if (QUERY_PARAMS._T) {
      /*
       * The query parameter _T is used to specifiy a Github access token.
       * This is useful if you are running into the query rate limit.
       * You can get an access token by logging into Github and going to:
       * Account Settings -> Applications -> Personal API Access Tokens
       */
      params.access_token = QUERY_PARAMS._T;      
    }
    return self.baseURL + (path ? path : "") + "?callback=?&" + $.param(params);
  };  

  self.checkResponse = function(response, context) {
    if (response.meta.status != 200) {
      error("An error occurred while trying to retrieve information on project "
        + "\"" + self.owner + "/" + self.project + "\""
        + ": " + response.data.message
        + " (code " + response.meta.status + ")",
        {'response' : response, 'context' : context}
      );
    }
  };
  
  self.query = function(callback) {
    $.getJSON(self.buildURL())
    .done(function(response) {
      self.checkResponse(response, this);
      self.queryTasks(response.data, callback);
    })
    .fail(ajaxFailHandler);
  };
  
  self.queryTasks = function(project, callback) {
    var params = {};
    if (self.label) {
      params.labels = self.label;
    }
    $.getJSON(self.buildURL("/issues", params))
    .done(function(response) {
      self.checkResponse(response, this);
      project.tasks = response.data;
      for (var i in project.tasks) {
        if (project.tasks[i].body.length > 200) {
          project.tasks[i].summary = project.tasks[i].body.substr(0, 200) + "...";
        } else {
          project.tasks[i].summary = project.tasks[i].body;
        }
      }
      callback(project);
    })
    .fail(ajaxFailHandler);
  };
  
};


var ViewModel = function() {
  var self = this;
  
  self.projects = ko.observableArray();
  self.alerts = ko.observableArray();

  self.alert = function(message, options) {
    if (! options) {
      options = {};
    }
    
    var a = {
      'type' : options['type'],
      'message' : message,
      'isDismissable' : options['dismissable'],
      'icon' : options['icon'],
    };  
    
    switch (a.type) {
    case undefined:
      a.type = 'error';
      break;
    case 'busy':
      a.type = 'info';
      if (a.isDismissable === undefined) {
        a.isDismissable = false;
      }
      if (a.icon === undefined) {
        a.icon = {'src': 'icon-busy.gif', 'height': 32, 'width': 32};        
      }
      break;
    case 'error':
    case 'warn':
    case 'info':
    case 'success':
      break;
    default:
      error("Internal error: unknown alert type: " + a.type);
    }
    
    if (a.isDismissable === undefined) {
      a.isDismissable = true;
    }

    self.alerts.push(a);
    return a;
  }
  
  
};

