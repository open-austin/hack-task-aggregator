Hack Task Aggregator
====================

Web application to aggregate tasks across projects that are identified for "hacking".

The "Hack Task Aggregator" is a client (Javascript) application that queries a
collection of project repositories, identifies all the tasks marked for "hacking",
and presents a single page with this information.

We produced this so that people who were interested in hacking on an Open Austin
(http://www.open-austin.org/) project could see what's available.

At this time, the application only supports the Github issue management system.
Github allows you to create custom labels and apply them to issues. We use a
"hack" label across projects for tasks that are available for an interested
hacker to work on.


Add Your Project to Our List
----------------------------

If you are an Open Austin member and have a project to add to this list, just clone
this project, add your project to the "project-defs.json" file and send out a
pull request.

Please be sure to test first! This JSON file is very brittle, and the app will
fail if you introduce any problems.


Steal this App
--------------

This app should be very portable. The files you'll want to edit are:

* index.html
* project-defs.json
* assets/hack-task-aggregator.css (if you wish to re-style)

You should *not* have to edit "hack-task-aggregator.js". If you do, please send
us a pull request with a fix to address your portability concerns.


Problem: API Rate Limit Exceeded
--------------------------------

Github rate limits the number of queries an anonymous user can make. This should
not be a problem in normal use. This could easily become a problem during development.

This app has a feature that allows you to specify a Github access token,
to provide an extended query limit.

First, you will need to get an access token by logging into your Github account
and going to:

    Account Settings -> Applications -> Personal API Access Tokens
  
Once you have your token, specify it in the request with a "_T" parameter:

    .../index.html?_T=856e3ee345aa271506d1dcb33d67c9363726ceba
      

Problem: Failure when running Google Chrome local
-------------------------------------------------

Typically, in development, you will simply open "index.html" as a local file
with your web browser. If you do this with Google Chrome you may get an error.
If you open up the Javascript console, you will see the message:

    Failed to load resource: Origin null is not allowed by Access-Control-Allow-Origin. 

That's a known bug with Chrome, when it tries to use the jQuery $.getJSON() operation
on a local file.

Fortunately, there is an easy workaround. Just start Chrome with the
"--allow-file-access-from-files" option.


Credits
-------

Primary author is Chip Rosenthal <chip@unicom.com>.