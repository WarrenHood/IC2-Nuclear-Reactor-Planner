var currentGridModifier = "panel-cell";
var reactorGrid = [];
var mouseIsDown = false;
var indicator = null;

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

function showDescription(description){
    document.getElementById("info-panel-title").innerHTML = descriptions[description].title;
    document.getElementById("info-panel").innerHTML = descriptions[description].description;
}

function removeGridModifier(){
    currentGridModifier = "panel-cell";
    indicator.className = currentGridModifier;
}

function GridItem(x,y,element){
        var o = {};
        o.row = x;
        o.column = y;
        o.element = element;
        o.element.onmouseover = function(e){
            if(mouseIsDown)
                this.className = currentGridModifier;
        };
        
        o.element.onmousedown = function(e){
            e = e || event;
            if(e.button == 0)
                this.className = currentGridModifier;
        };
        return o;
}

function setGridModifierHandler(element){
    element.onclick = function(e){
        e = e || event;
        currentGridModifier = this.className;
        indicator.className = currentGridModifier;
    }
    element.onmouseover = function(e){
        showDescription(this.className.replace("panel-cell ",""));
    }
}

window.onload = function(){
    indicator = document.getElementById("indicator");
    
    document.onmousemove = function(e){
        e = e || event;
        indicator.style.left = e.clientX - 18 + "px"
        indicator.style.top = e.clientY - 18 + "px";
    }
    
    document.oncontextmenu = function(){
        return false;
    }
    
    document.body.onmousedown = function(e){
        e = e || event;
        if (e.button == 0) {
            mouseIsDown = true;
        }
        else {
            mouseIsDown = false;
            removeGridModifier();
        }
    }
    
    document.body.onmouseup = function(e){
        e = e || event;
        if (e.button == 0){
            mouseIsDown = false;
        }
    }
    
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







