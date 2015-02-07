'use strict';

var eventTarget = require('./eventTarget'),
    EventData   = require('./EventData');

var Ticker = function()
{
    this.updateBind = this.update.bind(this);

    this.active = false;
    this.eventData = new EventData( this, 'tick', { deltaTime:1 } );

    this.deltaTime = 1;
    this.timeElapsed = 0;
    this.lastTime = 0;

    this.speed = 1;

    // auto start ticking!
    this.start();
};



eventTarget.mixin(Ticker.prototype);

Ticker.prototype.start = function()
{
    if(this.active)
    {
        return;
    }

    this.active = true;
    requestAnimationFrame(this.updateBind);
};


Ticker.prototype.stop = function()
{
    if(!this.active)
    {
        return;
    }

    this.active = false;
};

Ticker.prototype.update = function()
{
    if(this.active)
    {
        requestAnimationFrame(this.updateBind);

        var currentTime =  new Date().getTime();
        var timeElapsed = currentTime - this.lastTime;

        // cap the time!
        if(timeElapsed > 100)
        {
            timeElapsed = 100;
        }

        this.deltaTime = (timeElapsed * 0.06);

        this.deltaTime *= this.speed;

        // 60 ---> 1
        // 30 ---> 2

        this.eventData.data.deltaTime = this.deltaTime;

        this.emit( 'tick', this.eventData );

        this.lastTime = currentTime;
    }

};

module.exports = new Ticker();
