// TODO: Implement handling MOX fuels


var currentGridModifier = "panel-cell";
var mouseIsDown = false;
var indicator = null;

var simulationTime = 0;
var reactorHullHeat = 0;
var reactorGrid = [];

var currentInterval = null;

// TODO: Implement grid updating in interval
var gridRequiresUpdate = true;


var descriptions = {
    "fuel-uranium-single" : {
        "title": "Uranium Rod",
        "description": "A single uranium cell produces 5 EU/t (10 EU/t if next to 1 Uranium Cell, 15 EU/t if next to 2 Uranium Cells, etc.) generating a total of 1-5 million EU per cycle (2 hours and 47 minutes real time)"
    },
    "fuel-uranium-dual" : {
        "title": "Dual Uranium Rod",
        "description": "Dual uranium cells act like two single uranium cells next to each other. They generate 4x the energy that a single uranium cell produces at the cost of generating 6x the heat at 24hU/s. "
    },
    "fuel-uranium-quad" : {
        "title": "Quad Uranium Rod",
        "description": "These cells produce (alone) 60 EU/t, and 96 Heat/t. It also sends 4 Neutron Pulses to each adjacent component. They otherwise function like a normal Uranium Cell. Each cell has a life of 4000s. "
    },
    "fuel-mox-single" : {
        "title": "Mox Rod",
        "description": "A single mox rod."
    },
    "fuel-mox-dual" : {
        "title": "Dual Mox Rod",
        "description": "A dual mox rod."
    },
    
}

function calculateEfficiency(numberOfCells, totalEnergyProduced){
    return (totalEnergyProduced/numberOfCells)/5;
}

function calculatePulses(numCells, numNearbyCells){
    return 1 + Math.floor(numCells/2) + numNearbyCells;
}

function calculateEU(numCells, pulses){
    return 5*numCells*pulses;
}

function calculateHU(numCells, pulses){
    return 2*numCells*pulses*(pulses+1);
}

function showDescription(description){
    document.getElementById("info-panel-title").innerHTML = descriptions[description].title;
    document.getElementById("info-panel").innerHTML = descriptions[description].description;
    document.getElementById("info").style.visibility = "visible";
}

function removeGridModifier(){
    currentGridModifier = "panel-cell";
    indicator.className = currentGridModifier;
}

function GridItem(x,y,element){
        var o = {};
        o.x = x;
        o.y = y;
        
        // Default update methods
        o.update = function(){};
        o.doHeatGeneration = function(){};
                
        // Do event handling
        o.element = element;
        o.element.onmouseover = function(e){
            if(mouseIsDown){
                this.className = currentGridModifier;
                initialiseGrid();
            }
        };
        
        o.element.onmousedown = function(e){
            e = e || event;
            if(e.button == 0){
                this.className = currentGridModifier;
                initialiseGrid();
            }
        };
        return o;
}

function initialiseGrid(){
    for(var i=0; i<reactorGrid.length; i++){
        initialiseElement(reactorGrid[i]);
    }
    for(var i=0; i<reactorGrid.length; i++){
        reactorGrid[i].update();
    }
}

function initialiseElement(o){
    // Element specific stuff
        
        o.name = o.element.className.replace("panel-cell ","");
        o.heat = 0;
        o.broken = false;
        
        // Handle uranium fuels
        // TODO: Handle lifespan of cells
        
        o.isUranium = true;
        if (o.name == "fuel-uranium-single") o.numberOfCells = 1;
        else if (o.name == "fuel-uranium-dual") o.numberOfCells = 2;
        else if (o.name == "fuel-uranium-quad") o.numberOfCells = 4;
        else o.isUranium = false;
        
        
        if(o.isUranium){
            o.heatAcceptors = [];
            // Uranium state updater
            
            o.update = function(){
                var adjacentUraniumCells = 0;
                
                // TODO: Check that these 4 shouldn't rather be adjacentUraniumCells += numberOfOtherComponentCells
                // TODO: Ensure that these 4 cells aren't depleted
                if (this.x > 0 && getReactorComponent(this.x-1,this.y) && getReactorComponent(this.x-1,this.y).isUranium ) adjacentUraniumCells++;
                if (this.x < 8 && getReactorComponent(this.x+1,this.y) && getReactorComponent(this.x+1,this.y).isUranium ) adjacentUraniumCells++;
                if (this.y > 0 && getReactorComponent(this.x,this.y-1) && getReactorComponent(this.x,this.y-1).isUranium ) adjacentUraniumCells++;
                if (this.y < 8 && getReactorComponent(this.x,this.y+1) && getReactorComponent(this.x,this.y+1).isUranium ) adjacentUraniumCells++;
                
                // TODO: Implement logic for reflectors reflecting pulses back to this cell
                this.pulseRate = calculatePulses(this.numberOfCells, adjacentUraniumCells);
                
                this.energyRate = calculateEU(this.numberOfCells, this.pulseRate);
                
                this.heatRate = calculateHU(this.numberOfCells, this.pulseRate);
                
                // Check for nearby vents that will dissipate this heat
                
                if (this.x > 0 && getReactorComponent(this.x-1,this.y) && getReactorComponent(this.x-1,this.y).name == "heat-vent-component" ) this.heatRate -= 4;
                if (this.x < 8 && getReactorComponent(this.x+1,this.y) && getReactorComponent(this.x+1,this.y).name == "heat-vent-component" ) this.heatRate -= 4;
                if (this.y > 0 && getReactorComponent(this.x,this.y-1) && getReactorComponent(this.x,this.y-1).name == "heat-vent-component" ) this.heatRate -= 4;
                if (this.y < 8 && getReactorComponent(this.x,this.y+1) && getReactorComponent(this.x,this.y+1).name == "heat-vent-component" ) this.heatRate -= 4;
                
                // Clamp Heat Generation rate
                if(this.heatRate < 0) this.heatRate = 0;
                
                // Keep track of available sources for heat transfer (Vents only... Exchangers will pull at their own rate)
                // TODO: Confirm that exchangers shouldn't be given heat like the vents...
                // Nevermind... I think uranium cells will pump heat straight into this
                this.heatAcceptors = [];
                
                if (this.x > 0 && getReactorComponent(this.x-1,this.y) && getReactorComponent(this.x-1,this.y).acceptsHeat && !getReactorComponent(this.x-1,this.y).broken) this.heatAcceptors.push(getReactorComponent(this.x-1,this.y));
                if (this.x < 8 && getReactorComponent(this.x+1,this.y) && getReactorComponent(this.x+1,this.y).acceptsHeat && !getReactorComponent(this.x+1,this.y).broken) this.heatAcceptors.push(getReactorComponent(this.x+1,this.y));
                if (this.y > 0 && getReactorComponent(this.x,this.y-1) && getReactorComponent(this.x,this.y-1).acceptsHeat && !getReactorComponent(this.x,this.y-1).broken) this.heatAcceptors.push(getReactorComponent(this.x,this.y-1));
                if (this.y < 8 && getReactorComponent(this.x,this.y+1) && getReactorComponent(this.x,this.y+1).acceptsHeat && !getReactorComponent(this.x,this.y+1).broken) this.heatAcceptors.push(getReactorComponent(this.x,this.y+1));
                
            }
        
            // Manage Heat production
            
            o.doHeatGeneration = function(){
                if(!this.isUranium) return;
                var heatToProduce = this.heatRate;
                var dividedHeat = heatToProduce/this.heatAcceptors.length;
                
                for (var i=0; i<this.heatAcceptors.length; i++){
                    var remainingDurability = this.heatAcceptors[i].maxHeat - this.heatAcceptors[i].heat;
                    if (remainingDurability < dividedHeat){
                        heatToProduce -= remainingDurability;
                        this.heatAcceptors[i].heat = this.heatAcceptors[i].maxHeat;
                        this.heatAcceptors[i].broken = true;
                        gridRequiresUpdate = true;
                    }
                    else {
                        this.heatAcceptors[i].heat += dividedHeat;
                        heatToProduce -= dividedHeat;
                    }
                    dividedHeat = heatToProduce/(this.heatAcceptors.length-i);
                }
                
                reactorHullHeat += heatToProduce;
            }
        }
        
        // Handle vents
        o.isVent = true;
        o.acceptsHeat = true;
        o.maxHeat = 1000;
        o.reactorPullRate = 0;
        o.coolsAdjacent = false;
        o.dissipationRate = 0;
        if (o.name == "heat-vent"){
            o.dissipationRate = 6;
        }
        else if(o.name == "heat-vent-reactor"){
            o.dissipationRate = 5;
            o.reactorPullRate = 5;
        }
        else if(o.name == "heat-vent-advanced"){
            o.dissipationRate = 12;
        }
        else if(o.name == "heat-vent-component"){
            o.acceptsHeat = false;
            o.componentCoolingRate = 4;
            o.coolsAdjacent = true;
        }
        else if(o.name == "heat-vent-overclocked"){
            o.dissipationRate = 20;
            o.reactorPullRate = 36;
        }
        else {
            o.isVent = false;
            o.acceptsHeat = false;
        }
        
        if(o.isVent) {
            
            // Vent state updater
            o.update = function(){
                // Nothing right now
            }
            
            // Pull heat from reactor if possible method
            o.pullFromReactor = function(){
                if (this.broken) return;
                var remainingDurability = this.maxHeat - this.heat;
                
                
                if (this.reactorPullRate > reactorHullHeat){
                    // If we can pull more than the hull has
                    
                    if (remainingDurability <= reactorHullHeat){
                        // This component will break since we can't pull all remaining heat
                        reactorHullHeat -= remainingDurability;
                        this.heat = this.maxHeat;
                        this.broken = true;
                        gridRequiresUpdate = true;
                    }
                    else{
                        // We can pull all remaining hull heat without breaking
                        this.heat += reactorHullHeat;
                        reactorHullHeat = 0;
                    }
                }
                else {
                    // If the hull has more heat than we can pull
                    
                    if(remainingDurability <= this.reactorPullRate){
                        // This component will break
                        reactorHullHeat -= remainingDurability;
                        this.heat = this.maxHeat;
                        this.broken = true;
                        gridRequiresUpdate = true;
                    }
                    else {
                        // The component can pull its reactorPullRate from the hull without breaking
                        reactorHullHeat -= this.reactorPullRate;
                        this.heat += this.reactorPullRate;
                    }
                }
            }
            
            // Manage heat dissipation
            
            o.doHeatDissipation = function(){
                if(this.broken) return;
                this.heat -= this.dissipationRate;
                if (this.x > 0 && getReactorComponent(this.x-1,this.y) && getReactorComponent(this.x-1,this.y).name == "heat-vent-component") this.heat -= 4;
                if (this.x < 8 && getReactorComponent(this.x+1,this.y) && getReactorComponent(this.x+1,this.y).name == "heat-vent-component") this.heat -= 4;
                if (this.y > 0 && getReactorComponent(this.x,this.y-1) && getReactorComponent(this.x,this.y-1).name == "heat-vent-component") this.heat -= 4;
                if (this.y < 8 && getReactorComponent(this.x,this.y+1) && getReactorComponent(this.x,this.y+1).name == "heat-vent-component") this.heat -= 4;
                
                // Clamp this component's heat
                if (this.heat < 0) this.heat = 0; 
            }
        }
        
        // Handle heat exchangers
        
        o.isHeatExchanger = true;
        
        if (o.name == "heat-exchanger"){
            o.acceptsHeat = true;
            o.adjacentPullRate = 12;
            o.reactorPullRate = 4;
            o.maxHeat = 2500;
        }
        else if(o.name == "heat-exchanger-advanced"){
            o.acceptsHeat = true;
            o.adjacentPullRate = 24;
            o.reactorPullRate = 8;
            o.maxHeat = 5000;
        }
        else if(o.name == "heat-exchanger-reactor"){
            o.acceptsHeat = true;
            o.adjacentPullRate = 0;
            o.reactorPullRate = 72;
            o.maxHeat = 2500;
        }
        else if(o.name == "heat-exchanger-component"){
            o.acceptsHeat = true;
            o.adjacentPullRate = 36;
            o.reactorPullRate = 0;
            o.maxHeat = 5000;
        }
        else {
            o.isHeatExchanger = false;
        }
        
        if (o.isHeatExchanger){
            o.heat = 0;
            o.update = function(){
                
                // Look for available sources of heat which are connected
                
                this.heatAcceptors = [];
                
                if (this.x > 0 && getReactorComponent(this.x-1,this.y) && getReactorComponent(this.x-1,this.y).acceptsHeat && !getReactorComponent(this.x-1,this.y).broken) this.heatAcceptors.push(getReactorComponent(this.x-1,this.y));
                if (this.x < 8 && getReactorComponent(this.x+1,this.y) && getReactorComponent(this.x+1,this.y).acceptsHeat && !getReactorComponent(this.x+1,this.y).broken) this.heatAcceptors.push(getReactorComponent(this.x+1,this.y));
                if (this.y > 0 && getReactorComponent(this.x,this.y-1) && getReactorComponent(this.x,this.y-1).acceptsHeat && !getReactorComponent(this.x,this.y-1).broken) this.heatAcceptors.push(getReactorComponent(this.x,this.y-1));
                if (this.y < 8 && getReactorComponent(this.x,this.y+1) && getReactorComponent(this.x,this.y+1).acceptsHeat && !getReactorComponent(this.x,this.y+1).broken) this.heatAcceptors.push(getReactorComponent(this.x,this.y+1));
                
                
                // Check for nearby vents that will dissipate this heat
                this.heatDissipationRate = 0;
                
                if (this.x > 0 && getReactorComponent(this.x-1,this.y) && getReactorComponent(this.x-1,this.y).name == "heat-vent-component" ) this.heatDissipationRate += 4;
                if (this.x < 8 && getReactorComponent(this.x+1,this.y) && getReactorComponent(this.x+1,this.y).name == "heat-vent-component" ) this.heatDissipationRate += 4;
                if (this.y > 0 && getReactorComponent(this.x,this.y-1) && getReactorComponent(this.x,this.y-1).name == "heat-vent-component" ) this.heatDissipationRate += 4;
                if (this.y < 8 && getReactorComponent(this.x,this.y+1) && getReactorComponent(this.x,this.y+1).name == "heat-vent-component" ) this.heatDissipationRate += 4;
                
            }
            
            o.doHeatDissipation = function(){
                // Broken heat exchangers cannot have heat dissipated
                if (this.broken) return;
                
                
                // Dissipate this heat if connected to a vent
                this.heat -= this.heatDissipationRate;
                
                // Clamp this heat
                if (this.heat < 0) this.heat = 0;
            }
            
            o.doHeatExchange = function(){
                // Broken heat exchangers cannot exchange heat with things
                if(this.broken) return;
                
                // Either keep heat, or distribute it, or take it
                
                var minCompHeatPerc = minHeatPercentage(this.heatAcceptors);
                var maxCompHeatPerc = maxHeatPercentage(this.heatAcceptors);
                var ownHeatPerc = heatPercent(this);
                var reactorHeatPerc = reactorHullHeat/10000;
                
                var componentHeatToTransfer = this.adjacentPullRate;
                var reactorHeatToTransfer = this.reactorPullRate;
                var somethingChanged = true;
                
                while (somethingChanged && !this.broken) {
                    somethingChanged = false;
                    
                    if (reactorHeatPerc >= ownHeatPerc && reactorHeatPerc >= maxCompHeatPerc){
                        // Reactor is the hottest of them all, Take from reactor
                        
                        if(ownHeatPerc > minCompHeatPerc){
                            // reactor hotter than self, self hotter than coolest... Take from reactor and give to coolest
                            
                            // Take 1 heat from reactor if possible
                            if (reactorHeatToTransfer > 0){
                                reactorHeatToTransfer--;
                                reactorHullHeat--;
                                somethingChanged = true;
                                this.heat++;
                                if (this.heat >= this.maxHeat)
                                    this.broken = true;
                            }
                            
                            // Give 1 heat to coolest component if possible
                            if(componentHeatToTransfer > 0){
                                for(var i=0; i<this.heatAcceptors.length; i++){
                                    if(Math.abs(heatPercent(this.heatAcceptors[i]) - minCompHeatPerc) <= 1e-6 ){
                                        transferHeat(this,this.heatAcceptors[i],1);
                                        componentHeatToTransfer--;
                                        somethingChanged = true;
                                        break;
                                    }
                                }
                            }
                        }
                        else{
                            // Everything else is hotter than self
                            
                            // Take 1 heat from reactor if possible
                            if (reactorHeatToTransfer > 0){
                                reactorHeatToTransfer--;
                                reactorHullHeat--;
                                somethingChanged = true;
                                this.heat++;
                                if (this.heat >= this.maxHeat)
                                    this.broken = true;
                            }
                            
                            // Take 1 heat from hottest component if possible
                            if (componentHeatToTransfer > 0){
                                for(var i=0; i<this.heatAcceptors.length; i++){
                                    if(Math.abs(heatPercent(this.heatAcceptors[i]) - maxCompHeatPerc) <= 1e-6 ){
                                        transferHeat(this.heatAcceptors[i],this,1);
                                        componentHeatToTransfer--;
                                        somethingChanged = true;
                                        break;
                                    }
                                }
                            }
                        }
                        
                    }
                    
                    else if(ownHeatPerc >= reactorHeatPerc && ownHeatPerc >= maxCompHeatPerc){
                        // Self is hottest of them all, give heat to reactor and all components
                        
                        if(maxCompHeatPerc > reactorHeatPerc){
                            // The hottest component is hotter than the reactor, give to reactor
                            
                            // Give the reactor heat if possible
                            if (reactorHeatToTransfer == 0) continue;
                            reactorHeatToTransfer--;
                            reactorHullHeat++;
                            this.heat--;
                            somethingChanged = true;
                            
                        }
                        else{
                            // The reactor is hotter than the hottest component, give to hottest component
                            // Give the coolest component heat if possible
                            if(componentHeatToTransfer == 0) continue;
                            for(var i=0; i<this.heatAcceptors.length; i++){
                                if(Math.abs(heatPercent(this.heatAcceptors[i]) - minCompHeatPerc) <= 1e-6 ){
                                    transferHeat(this,this.heatAcceptors[i],1);
                                    componentHeatToTransfer--;
                                    somethingChanged = true;
                                    break;
                                }
                            }
                            
                        }
            
                    }
                    else if(maxCompHeatPerc >= reactorHeatPerc && maxCompHeatPerc >= ownHeatPerc){
                        // The hottest component is hotter than reactor and self
                        
                        // Take some heat from hottest component if possible
                        if(componentHeatToTransfer > 0){
                            for(var i=0; i<this.heatAcceptors.length; i++){
                                if(Math.abs(heatPercent(this.heatAcceptors[i]) - maxCompHeatPerc) <= 1e-6 ){
                                    transferHeat(this,this.heatAcceptors[i],1);
                                    componentHeatToTransfer--;
                                    somethingChanged = true;
                                    break;
                                }
                            }
                        }
                        ownHeatPerc = heatPercent(this);
                        
                        if(ownHeatPerc > reactorHeatPerc){
                            // Self is hotter than the reactor, take from self and give to reactor
                            // Give the reactor heat if possible
                            if (reactorHeatToTransfer == 0) continue;
                            reactorHeatToTransfer--;
                            reactorHullHeat++;
                            this.heat--;
                            somethingChanged = true;
                        }
                        else{
                            // Reactor is hotter than self, take from reactor
                            
                             // Take 1 heat from reactor if possible
                            if (reactorHeatToTransfer > 0){
                                reactorHeatToTransfer--;
                                reactorHullHeat--;
                                somethingChanged = true;
                                this.heat++;
                                if (this.heat >= this.maxHeat)
                                    this.broken = true;
                            }
                            
                        }
                        
                        
                    }
                    
                    minCompHeatPerc = minHeatPercentage(this.heatAcceptors);
                    maxCompHeatPerc = maxHeatPercentage(this.heatAcceptors);
                    ownHeatPerc = heatPercent(this);
                    reactorHeatPerc = reactorHullHeat/10000;
                }

            }
        }
}

function heatPercent(component){
    if(!component || !component.heat) return null;
    return component.heat/component.maxHeat;
}

function minHeatPercentage(components){
    if(components.length == 0) return null;
    var minimum = heatPercent(components[0]);
    
    for(var i=0; i<components.length; i++){
        if(heatPercent(components[i]) < minimum) minimum = heatPercent(components[i]);
    }
    
    return minimum;
}

function maxHeatPercentage(components){
    if(components.length == 0) return null;
    var maximum = heatPercent(components[0]);
    
    for(var i=0; i<components.length; i++){
        if(heatPercent(components[i]) > maximum) maximum = heatPercent(components[i]);
    }
    
    return maximum;
}

function transferHeat(fromComponent, toComponent, amount){
    amount = amount || 1;
    //Don't transfer more heat than possible
    if(fromComponent.heat < amount){
        amount = fromComponent.heat;
    }
    
    var remainingDurability = toComponent.maxHeat - toComponent.heat;
    // If this amount of heat will break the component
    if(remainingDurability <= amount){
        fromComponent.heat -= remainingDurability;
        toComponent.heat = toComponent.maxHeat;
        toComponent.broken = true;
        gridRequiresUpdate = true;
    }
    else{
        // Otherwise do a normal transfer
        fromComponent.heat -= amount;
        toComponent.heat += amount;
    }
    
}

function getReactorComponent(x,y){
    for(var i=0; i<reactorGrid.length; i++){
        if(reactorGrid[i].x == x && reactorGrid[i].y == y)
            return reactorGrid[i];
    }
    return null;
}

function showHeat(){
    for(var i=0; i<reactorGrid.length; i++){
        if(reactorGrid[i].acceptsHeat){
            var red = 255*reactorGrid[i].heat/reactorGrid[i].maxHeat;
            var green = 255*(1-reactorGrid[i].heat/reactorGrid[i].maxHeat);
            if(!reactorGrid[i].broken)
                reactorGrid[i].element.style.backgroundColor = "rgba("+red+","+green+",0.1)";
            else 
                reactorGrid[i].element.style.backgroundColor = "black";
        }
    }
}

function updateGrid(){
    for (var i=0; i<reactorGrid.length; i++) reactorGrid[i].update();
}

function calculateTotalEU(){
    var total = 0;
    for(var i=0; i<reactorGrid.length; i++)
        if(reactorGrid[i].isUranium) total += reactorGrid[i].energyRate;
    return total;
}

function doReactorTick(){
    
    if(gridRequiresUpdate){
        gridRequiresUpdate = false;
        updateGrid();
    }
    
    if(reactorHullHeat >= 10000){
        if(currentInterval) clearInterval(currentInterval);
        return;
    }
    
    // Generate Heat
    
    for (var i=0; i<reactorGrid.length; i++){
        if (reactorGrid[i].isUranium) reactorGrid[i].doHeatGeneration();
    }
    
    
    // Pull heat from reactor
    for(var i=0; i<reactorGrid.length; i++){
        if (reactorGrid[i].isVent) reactorGrid[i].pullFromReactor();
    }
    
    // Do some heat exchange
    for (var i=0; i<reactorGrid.length; i++){
        if(reactorGrid[i].isHeatExchanger) reactorGrid[i].doHeatExchange();
    }
    
    // Dissipate heat
    for (var i=0; i<reactorGrid.length; i++){
        if (reactorGrid[i].isVent || reactorGrid[i].isHeatExchanger) reactorGrid[i].doHeatDissipation();
    }
    
    document.getElementById("heat-indicator").innerHTML = Math.round(reactorHullHeat,5) + " HU (" +Math.round(reactorHullHeat/100,5) + "%)";
    document.getElementById("power-indicator").innerHTML = calculateTotalEU() + " EU/t";
    simulationTime += 1;
    document.getElementById("time-indicator").innerHTML = simulationTime + " seconds";
    showHeat();
}

function setGridModifierHandler(element){
    element.onclick = function(e){
        e = e || event;
        currentGridModifier = this.className;
        indicator.className = currentGridModifier;
    }
    element.onmouseenter = function(e){
        showDescription(this.className.replace("panel-cell ",""));
    }
    element.onmouseleave = function(e){
        e = e || event;
        document.getElementById("info").style.visibility = "hidden";
    }
    
}

window.onload = function(){
    indicator = document.getElementById("indicator");
    
    window.onmousemove = function(e){
        e = e || event;
        indicator.style.left = e.clientX - 18 + "px"
        indicator.style.top = e.clientY - 18 + "px";
    }
    
    document.oncontextmenu = function(){
        return false;
    }
    
    window.onmousedown = function(e){
        e = e || event;
        if (e.button == 0) {
            mouseIsDown = true;
        }
        else {
            mouseIsDown = false;
            removeGridModifier();
        }
    }
    
    window.onmouseup = function(e){
        e = e || event;
        if (e.button == 0){
            mouseIsDown = false;
        }
    }
    
    document.getElementById("step1").onclick = doReactorTick;
    document.getElementById("normalsim").onclick = function(){
        if(!currentInterval)
            currentInterval = setInterval(doReactorTick, 1000);
    };
    document.getElementById("fastsim").onclick = function(){
        if(!currentInterval)
            currentInterval = setInterval(doReactorTick, 1);
    };
    document.getElementById("stopsim").onclick = function(){
        if(currentInterval)
            clearInterval(currentInterval);
        currentInterval = null;
    };
    document.getElementById("resetsim").onclick = function(){
        if(currentInterval)
            clearInterval(currentInterval);
        currentInterval = null;
        simulationTime = 0;
        reactorHullHeat = 0;
        initialiseGrid();
        document.getElementById("heat-indicator").innerHTML = reactorHullHeat + " HU (" +reactorHullHeat/100 + "%)";
        document.getElementById("power-indicator").innerHTML = calculateTotalEU() + " EU/t";
        document.getElementById("time-indicator").innerHTML = simulationTime + " seconds";
        for(var i=0; i<reactorGrid.length; i++){
            reactorGrid[i].element.style.backgroundColor = "#8b8b8b";
        }
    };
    var fuelRows = document.getElementById("reactor-panel").getElementsByClassName("panel-row");
    var toolPanels = document.getElementsByClassName("toolpanel");
    
    for (var i=0; i<fuelRows.length; i++){
        for(var j=0; j < fuelRows[i].getElementsByClassName("panel-cell").length; j++){
            reactorGrid.push(GridItem(j,i,fuelRows[i].getElementsByClassName("panel-cell")[j]));
        }
    }
    
    for (var i=0; i<toolPanels.length; i++ ) {
        var panelCells = toolPanels[i].getElementsByClassName("panel-cell");
        for (var j=0; j < panelCells.length; j++) {
            setGridModifierHandler(panelCells[j]);
        }
    }
}







