/**
 * Display an alert to the user.
 * 
 * @param mssg  Message text.
 * @return  nothing
 * 
 * This simply calls the Javascript alert() function. It
 * can be overridden later, once the framework is running,
 * to display the alerts as message boxes on the page.
 */
var appAlert = function(mssg) {
  alert(mssg);
}

/**
 * Terminate a thread with an error.
 * 
 * @param mssg  Error messsage text.
 * @param trace  Object with trace information.
 * @return  does not return
 * 
 * The message will be displayed with appAlert().
 * The message and trace information will be logged
 * to the console as an error.
 * Finally, an exception will be thrown.
 */
var error = function(mssg, trace) {
  appAlert(mssg);
  console.error({'message': mssg, 'trace': trace});
  throw new Error(mssg);
}


/**
 * Handle failure of a jQuery AJAX operation.
 * 
 * Invokes error() to handle an AJAX operation failure.
 * 
 * Example usage is:
 * 
 *   $.getJSON() ... .fail(ajaxFailHandler) ...;
 */
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

/**
 * Object containing the current query parameters.
 */
var QUERY_PARAMS = getQueryParams(document.URL);


/**
 * Class that implements that Hack Task Aggregator application.
 * 
 * @param projectDefs  List of project definitions.
 * @param appDefs  Parameter settings for the application.
 * 
 * TODO - Add description for the parameters. 
 */
var HackTaskAggregator = function(projectDefs, appDefs) {
  
  if (! appDefs) {
    appDefs = {};
  }  
  appDefs.DEFAULT_LABEL = appDefs.DEFAULT_LABEL || "hack";
  appDefs.ALL_LABEL = appDefs.ALL_LABEL || "*";
  
  var self = this;
  
  self.view = new ViewModel();
  ko.applyBindings(self.view);
  
  /*
   * Now that the framework is running, override appAlert()
   * to display alert on page rather than a Javascript
   * alert() pop-up.
   */
  appAlert = self.view.alert;
  
  /* 
   * Process each of the project definitions,
   * query the repository for hack tasks,
   * and add them too the view instance.
   */
  projectDefs.forEach(function(projectDef) {
    new QueryProjectGitHub(projectDef, appDefs)
    .query(function(projectInfo) {
      self.view.projects.push(projectInfo);      
    });
  });
  
};


/**
 * Class that implements the project query operations for GitHub.
 * 
 * @param projectDef
 * @param appDefs
 * 
 * TODO - Add description for the parameters. 
 * 
 * At some point we may want to abstract this, so there can
 * be a variety of classes that handle different task repositories.
 */
var QueryProjectGitHub = function(projectDef, appDefs) {
  
  var self = this;
  
  if (! projectDef.owner) {
    error("Error in repository definition: required parameter \"owner\" not defined", {'projectDef' : projectDef});
  }
  self.owner = projectDef.owner;
  
  if (! projectDef.project) {
    error("Error in repository defintion: required parameter \"project\" not defined", {'projectDef' : projectDef});
  }
  self.project = projectDef.project;
  
  self.label = projectDef.label || appDefs.DEFAULT_LABEL;
  if (self.label == appDefs.ALL_LABEL) {
    self.label = undefined;
  }
  
  self.baseURL = "https://api.github.com/repos/" + encodeURIComponent(self.owner) + "/" + encodeURIComponent(self.project);
  
  /**
   * Build a URL to query a GitHub repo.
   * 
   * @param path  Path to append to baseURL, if any. Must start with "/".
   * @param params  Optional object of query parameter values, keyed by parameter name.
   */
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

  /**
   * Check the "meta.status" value of a GitHub query.
   * 
   * @param response The query response
   * @param context The calling context, e.g. "this" in the caller.
   * @return nothing
   * 
   * Calls error() if the query status indicates the request failed.
   */
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
  
  /**
   * TODO - document me
   */
  self.query = function(callback) {
    $.getJSON(self.buildURL())
    .done(function(response) {
      self.checkResponse(response, this);
      self.queryTasks(response.data, callback);
    })
    .fail(ajaxFailHandler);
  };

  /**
   * TODO - document me
   */
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


/**
 * TODO - document me
 */
var ViewModel = function() {
  var self = this;
  
  self.projects = ko.observableArray();
  self.alerts = ko.observableArray();

  /**
   * TODO - document me
   */
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

