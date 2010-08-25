Faye.NodeHttpTransport = Faye.Class(Faye.Transport, {
  request: function(message, timeout) {
    var uri      = url.parse(this._endpoint),
        secure   = (uri.protocol === 'https:'),
        client   = http.createClient(uri.port, uri.hostname, secure),
        content  = JSON.stringify(message),
        response = null,
        retry    = this.retry(message, timeout),
        self     = this;

    client.addListener('error', retry);

    client.addListener('end', function() {
      if (!response) retry();
    });

    var request = client.request('POST', uri.pathname, {
      'Content-Type':   'application/json',
      'Host':           uri.hostname,
      'Content-Length': content.length
    });

    request.addListener('response', function(stream) {
      response = stream;
      Faye.withDataFor(response, function(data) {
        try {
          self.receive(JSON.parse(data));
        } catch (e) {
          var stack = e.stack.split("\n");
          self.error(stack[0] +  " " + stack[1].replace(/ +/, ''));
          self.debug(e.stack);

          retry();
        }
      });
    });

    request.write(content);
    request.end();
  }
});

Faye.NodeHttpTransport.isUsable = function(endpoint) {
  return typeof endpoint === 'string';
};

Faye.Transport.register('long-polling', Faye.NodeHttpTransport);

Faye.NodeLocalTransport = Faye.Class(Faye.Transport, {
  request: function(message, timeout) {
    this._endpoint.process(message, true, this.receive, this);
  }
});

Faye.NodeLocalTransport.isUsable = function(endpoint) {
  return endpoint instanceof Faye.Server;
};

Faye.Transport.register('in-process', Faye.NodeLocalTransport);

