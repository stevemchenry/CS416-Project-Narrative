"use strict"

import "https://d3js.org/d3.v7.min.js";
import * as storyContent from "./storyContent.js";

// Declare global variables and set static values
let canvas = null;
let storyContainer = null;
let navigation = null;
const scene = {};
const datasets = {};
const charts = {};
const canvasWidth = 1000;
const canvasHeight = 800;
const sceneTransitionTime = 500;
const chartTransitionTime = 2000;
const dateParser = d3.utcParse("%Y-%m-%d");

// Execute the narrative visualization
init();

// Initialize the narrative visualization
function init() {
    // Store the canvas selection, story container, and navigation controls into variables
    canvas = d3.select("#canvas");
    storyContainer = document.getElementById("story");
    navigation = document.getElementsByTagName("nav")[0]
        .getElementsByTagName("ul")[0];

    // Create the scene states
    // Any function may observe the sceneState variable, but only loadScene() may modify it
    scene.previous = 0;
    scene.current = 0;
    scene.viewed = storyContent.scenes.map(a => false);
    scene.loader = [null, loadScene1, loadScene2, loadScene3, loadScene4, loadScene5];

    // Create the chart specifications
    charts.pie = {
        chart : null,
        height: canvasHeight,
        width: canvasWidth,
        x : (canvasWidth / 2),
        y : (canvasHeight / 2),
        innerRadius: 150,
        outerRadius: 275,
        markSize : 50
    };

    charts.line = {
        chart : null,
        width : canvasWidth,
        height : canvasHeight,
        x : 0,
        y : 0,
        marginBottom : 50,
        marginLeft : 70,
        marginRight : 20,
        marginTop : 50,
        phases : {
            dotComBurst : {},
            growthPeriod2000s : {},
            greatRecession : {},
            postGreatRecession : {}
        }
    }

    // Set the canvas's dimensions
    canvas.attr("width", canvasWidth)
        .attr("height", canvasHeight);

    // Start the narrative visualization by loading the first scene
    loadScene(1);
}

// Load the specified scene
function loadScene(sceneNumber) {
    // Set the new scene as having been viewed
    scene.previous = scene.current;
    scene.current = sceneNumber;
    scene.firstView = !scene.viewed[scene.current];
    scene.viewed[scene.current] = true;
    
    // Update the navigation bar
    updateNavigationBar();

    // Load the story text
    const nodes = []

    let currentNode = document.createElement("h2");
    currentNode.innerHTML = storyContent.scenes[scene.current].title;
    nodes.push(currentNode);

    for(const paragraph of storyContent.scenes[scene.current].body) {
        currentNode = document.createElement("p")
        currentNode.innerHTML = paragraph;
        nodes.push(currentNode);
    }

    storyContainer.replaceChildren(...nodes);

    // Load the scene
    scene.loader[scene.current]();
}

// Update the navigation bar
function updateNavigationBar() {
    // Create an array to store the newly created nodes
    const nodes = [];

    // Add the "back" button
    let currentNode = document.createElement("li");
    currentNode.textContent = "◀";
    
    if(scene.current > 1) {
        currentNode.classList.add("enabled");
        currentNode.title = "Go back";
        currentNode.addEventListener("click", e => loadScene((scene.current - 1)));

    } else {
        currentNode.classList.add("disabled");
    }
    
    nodes.push(currentNode);

    // Add the scene selection buttons
    for(let i = 1; i < storyContent.scenes.length; ++i) {
        let currentNode = document.createElement("li");
        currentNode.textContent = i;
        
        if(i == scene.current) {
            currentNode.classList.add("current");
            currentNode.addEventListener("click", e => loadScene(i));

        } else if(scene.viewed[i]) {
            currentNode.classList.add("enabled");
            currentNode.addEventListener("click", e => loadScene(i));

        } else {
            currentNode.classList.add("disabled");
        }

        nodes.push(currentNode);
    }

    // Add the "forward" button
    currentNode = document.createElement("li");
    currentNode.textContent = "▶";

    if(scene.current < scene.viewed.length - 1) {
        currentNode.classList.add("enabled");
        currentNode.title = "Go forward";
        currentNode.addEventListener("click", e => loadScene((scene.current + 1)));

    } else {
        currentNode.classList.add("disabled");
    }

    nodes.push(currentNode);

    // Replace the old nav bar with the new nav bar
    navigation.replaceChildren(...nodes);
}

// Load scene 1
function loadScene1() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.popularRetailEquitiesEarly2023 === undefined) {
        d3.csv("./data/popular-retail-equities-early-2023.csv")
            .then(dataset => {
                datasets.popularRetailEquitiesEarly2023 = dataset;
                renderScene1Canvas();
            });
    
    } else {
        renderScene1Canvas();
    }
}

// Render scene 1's visualization onto the canvas
function renderScene1Canvas() {
    // Get the loaded dataset
    const dataset = datasets.popularRetailEquitiesEarly2023;
    const data = dataset.map(a => parseInt(a.RetailNetFlowMillions));

    // Clear the canvas
    document.getElementById("canvas").replaceChildren();

    // Declare the chart and its attributes
    const chart = {
        chart : null,
        height: canvasHeight,
        width: canvasWidth,
        x : (canvasWidth / 2),
        y : (canvasHeight / 2),
        innerRadius: 150,
        outerRadius: 275,
        markSize : 50
    };

    // Create the chart element and set its dimensions and position
    chart.chart = canvas.append("g")
        .attr("height", chart.height)
        .attr("width", chart.width)
        .attr("transform", `translate(${chart.x},${chart.y})`);

    // Create the chart title
    const chartTitleGroup = chart.chart.append("g")
        .attr("id", "chart-title-group");

    chartTitleGroup.datum("Retail Investors' Top 10 Picks for Early 2023")
        .append("text")
        .text(d => d)
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartTitleCenter(chart) - chart.x},${50 - chart.y})`);

    // Create the pie and arc generators
    const pie = d3.pie();
    const arc = d3.arc()
        .innerRadius(chart.innerRadius)
        .outerRadius(chart.outerRadius);

    // Create the pie chart and its entrance transition
    const chartGraphGroup = chart.chart.append("g")
        .attr("id", "chart-graph-group");

    chartGraphGroup.selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("fill", (d, i) => color(i))
        .transition()
        .duration(chartTransitionTime)
        .attrTween("d", d => {
            const originalEnd = d.endAngle;
            const angleInterpolation = d3.interpolate(pie.startAngle()(), pie.endAngle()());

            return t => {
                const currentAngle = angleInterpolation(t);

                if(currentAngle < d.startAngle) {
                    return "";
                }

                d.endAngle = Math.min(currentAngle, originalEnd);
                return arc(d);
            };
        });

    // Create the pie chart wedge icons and their entrance transition
    chartGraphGroup.selectAll("image")
        .data(pie(data))
        .enter()
        .append("image")
        .attr("opacity", 0.0)
        .attr("href", (d, i) => `./images/${dataset[i].LogoFile}`)
        .attr("width", chart.markSize)
        .attr("height", chart.markSize)
        .attr("transform", d => `translate(${arc.centroid(d)[0] - (chart.markSize / 2)},${arc.centroid(d)[1] - (chart.markSize / 2)})`)
        .transition()
        .delay(chartTransitionTime * 0.85)
        .duration(500)
        .attr("opacity", 1.0);

    // Create the text value sum counter
    chartGraphGroup.datum(data.reduce((accumulator, currentValue) => (accumulator + currentValue), 0))
        .append("text")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("class", "chart-focus-text")
        .transition()
        .duration(chartTransitionTime)
        .tween("text-focus", function(d) {
            const textInterpolation = d3.interpolate(0, d);
            const formatterNumberThousands = d3.format(",");
    
            return t => {
                this.textContent = `$${formatterNumberThousands(Math.round(textInterpolation(t)))}M`;
            };
        });

    // Create the tooltip ping icons
    const chartTooltipPingGroup = chart.chart.append("g")
        .attr("id", "chart-tooltip-ping-group");

    chartTooltipPingGroup.selectAll("image")
        .data(pie(data))
        .enter()
        .append("image")
        .attr("opacity", 0.0)
        .attr("href", "./images/ping.svg")
        .attr("width", chart.markSize)
        .attr("height", chart.markSize)
        .attr("transform", d => `translate(${(arc.centroid(d)[0] * 1.3) - (chart.markSize / 2)},${(arc.centroid(d)[1] * 1.3) - (chart.markSize / 2)})`)
        .transition()
        .delay(chartTransitionTime * 1.5)
        .duration(1000)
        .attr("opacity", 1.0);
}

// Load scene 2
function loadScene2() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.spxHistorical === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.spxHistorical = dataset;
                renderScene2Canvas();
            });
    
    } else {
        renderScene2Canvas();
    }
}

// Render scene 2's visualization onto the canvas
function renderScene2Canvas() {
    // Clear the canvas
    document.getElementById("canvas").replaceChildren();

    // Create an alias for the chart used by this scene
    const chart = charts.line;

    // Create the dataset subset
    chart.phases.dotComBurst.dateEnd = new Date("2002-09-28");
    chart.phases.dotComBurst.dataSubset = datasets.spxHistorical.filter(d => (dateParser(d.Date) <= chart.phases.dotComBurst.dateEnd));
    const dataDotComBurst = chart.phases.dotComBurst.dataSubset;

    // Create the chart (initially invisible)
    chart.chart = canvas.append("g")
        .attr("height", chart.height)
        .attr("width", chart.width)
        .attr("transform", `translate(${chart.x},${chart.y})`)
        .attr("opacity", "0.0");

    // Create the chart title
    chart.chart.append("text")
        .text("S&P 500 (2000-2002)")
        .attr("class", "chart-title")
        .attr("id", "chart-title")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartTitleCenter(chart)},${chart.marginTop})`);

    // Create the dot-com burst scales
    chart.phases.dotComBurst.scales = {};

    // Create the x scale
    chart.phases.dotComBurst.scales.x = d3.scaleTime()
        .domain(d3.extent(dataDotComBurst, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    const scaleX = chart.phases.dotComBurst.scales.x;

    // Create the y scale
    chart.phases.dotComBurst.scales.y = d3.scaleLinear()
        .domain([600, 1600])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    const scaleY = chart.phases.dotComBurst.scales.y;

    // Create the x axis
    chart.chart.append("g")
        .attr("id", "chart-axis-x")
        .attr("transform", `translate(0,${chart.height - chart.marginBottom})`)
        .call(d3.axisBottom(scaleX))
        // Create the axis label
        .append("text")
        .text("Date")
        .attr("class", "chart-axis-label")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartAxisXCenter(chart)},35)`);

    // Create the y axis
    chart.chart.append("g")
        .attr("id", "chart-axis-y")
        .attr("transform", `translate(${chart.marginLeft},0)`)
        .call(d3.axisLeft(scaleY))
        // Create the axis label
        .append("text")
        .text("Value")
        .attr("class", "chart-axis-label")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(-50,${chartAxisYCenter(chart)}) rotate(-90)`);

    // Create the line
    const pathValueSPX = chart.chart.append("path")
        .datum(dataDotComBurst)
        .attr("id", "chart-line-spx")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataDotComBurst[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataDotComBurst[i].Close)))
        );

    // Perform the chart's entrance transition
    chart.chart.transition()
        .duration(sceneTransitionTime)
        .ease(d3.easeLinear)
        .attr("opacity", "1.0");

    // Perform the extended line's entrance transition
    const pathValueSPXLength = pathValueSPX.node().getTotalLength();

    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength)
        .transition()
        .delay(sceneTransitionTime)
        .duration(chartTransitionTime * 2)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
}

// Load scene 3
function loadScene3() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.spxHistorical === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.spxHistorical = dataset;
                renderScene3Canvas();
            });
    
    } else {
        renderScene3Canvas();
    }
}

// Render scene 3's visualization onto the canvas
function renderScene3Canvas() {
    // Create an alias for the chart used by this scene
    const chart = charts.line;

    // Create the dataset subset
    chart.phases.growthPeriod2000s.dateEnd = new Date("2007-07-07");
    chart.phases.growthPeriod2000s.dataSubset = datasets.spxHistorical.filter(d => ((dateParser(d.Date) >= chart.phases.dotComBurst.dateEnd) && (dateParser(d.Date) <= chart.phases.growthPeriod2000s.dateEnd)));
    const dataSubsetThroughNow = datasets.spxHistorical.filter(d => (dateParser(d.Date) <= chart.phases.growthPeriod2000s.dateEnd));

    const dataDotComBurst = chart.phases.dotComBurst.dataSubset;
    const dataGrowthPeriod2000s = chart.phases.growthPeriod2000s.dataSubset;

    // Create the 2000s growth period scales
    chart.phases.growthPeriod2000s.scales = {};

    // Create the x scale
    chart.phases.growthPeriod2000s.scales.x = d3.scaleTime()
        .domain(d3.extent(dataSubsetThroughNow, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    const scaleX = chart.phases.growthPeriod2000s.scales.x;

    // Create the y scale (this should be the same as the previous phase)
    chart.phases.growthPeriod2000s.scales.y = d3.scaleLinear()
        .domain([600, 1600])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    const scaleY = chart.phases.growthPeriod2000s.scales.y;

    // Re-scale the x axis
    chart.chart.select("#chart-axis-x")
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .call(d3.axisBottom(scaleX))

    // Perform the line compression transition
    chart.chart.select("#chart-line-spx")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataDotComBurst[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataDotComBurst[i].Close)))
        );

    // Create the extended line
    const pathValueSPX = chart.chart.append("path")
        .datum(dataGrowthPeriod2000s)
        .attr("id", "chart-line-spx-2")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataGrowthPeriod2000s[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataGrowthPeriod2000s[i].Close)))
        );

    // Perform the extended line's entrance transition
    const pathValueSPXLength = pathValueSPX.node().getTotalLength();

    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength)
        .transition()
        .delay(chartTransitionTime)
        .duration(chartTransitionTime * 2)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
}













// Load scene 4
function loadScene4() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.spxHistorical === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.spxHistorical = dataset;
                renderScene4Canvas();
            });
    
    } else {
        renderScene4Canvas();
    }
}

// Render scene 3's visualization onto the canvas
function renderScene4Canvas() {
    // Create an alias for the chart used by this scene
    const chart = charts.line;

    // Create the dataset subset
    chart.phases.greatRecession.dateEnd = new Date("2009-02-28");
    chart.phases.greatRecession.dataSubset = datasets.spxHistorical.filter(d => ((dateParser(d.Date) >= chart.phases.growthPeriod2000s.dateEnd) && (dateParser(d.Date) <= chart.phases.greatRecession.dateEnd)));
    const dataSubsetThroughNow = datasets.spxHistorical.filter(d => (dateParser(d.Date) <= chart.phases.greatRecession.dateEnd));

    const dataDotComBurst = chart.phases.dotComBurst.dataSubset;
    const dataGrowthPeriod2000s = chart.phases.growthPeriod2000s.dataSubset;
    const dataGreatRecession = chart.phases.greatRecession.dataSubset;

    // Create the great recession scales
    chart.phases.greatRecession.scales = {};

    // Create the x scale
    chart.phases.greatRecession.scales.x = d3.scaleTime()
        .domain(d3.extent(dataSubsetThroughNow, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    const scaleX = chart.phases.greatRecession.scales.x;

    // Create the y scale (this should be the same as the previous two phases)
    chart.phases.greatRecession.scales.y = d3.scaleLinear()
        .domain([600, 1600])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    const scaleY = chart.phases.greatRecession.scales.y;

    // Re-scale the x axis
    chart.chart.select("#chart-axis-x")
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .call(d3.axisBottom(scaleX));

    // Perform the line compression transition
    chart.chart.select("#chart-line-spx")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        .attr("d", d3.line()
            .x((d, i) => chart.phases.growthPeriod2000s.scales.x(dateParser(dataDotComBurst[i].Date)))
            .y((d, i) => chart.phases.growthPeriod2000s.scales.y(parseFloat(dataDotComBurst[i].Close)))
        )
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataDotComBurst[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataDotComBurst[i].Close)))
        );

    chart.chart.select("#chart-line-spx-2")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataGrowthPeriod2000s[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataGrowthPeriod2000s[i].Close)))
        );

    // Create the extended line
    const pathValueSPX = chart.chart.append("path")
        .datum(dataGreatRecession)
        .attr("id", "chart-line-spx-3")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataGreatRecession[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataGreatRecession[i].Close)))
        );

    // Perform the extended line's entrance transition
    const pathValueSPXLength = pathValueSPX.node().getTotalLength();

    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength)
        .transition()
        .delay(chartTransitionTime)
        .duration(chartTransitionTime * 2)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
}









// Load scene 5
function loadScene5() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.spxHistorical === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.spxHistorical = dataset;
                renderScene5Canvas();
            });
    
    } else {
        renderScene5Canvas();
    }
}

// Render scene 5's visualization onto the canvas
function renderScene5Canvas() {
    // Declare the chart and its attributes
    const chart = charts.line;

    // Create the dataset subset
    const dataPostGreatRecession = datasets.spxHistorical.filter(d => (dateParser(d.Date) >= chart.phases.greatRecession.dateEnd));

    const dataDotComBurst = chart.phases.dotComBurst.dataSubset;
    const dataGrowthPeriod2000s = chart.phases.growthPeriod2000s.dataSubset;
    const dataGreatRecession = chart.phases.greatRecession.dataSubset;

    // Create the great recession scales
    chart.phases.postGreatRecession.scales = {};

    // Create the x scale
    chart.phases.postGreatRecession.scales.x = d3.scaleTime()
        .domain(d3.extent(datasets.spxHistorical, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    const scaleX = chart.phases.postGreatRecession.scales.x;

    // Create the y scale (this scale differs from the previous three scenes)
    chart.phases.postGreatRecession.scales.y = d3.scaleLinear()
        .domain([600, 4600])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    const scaleY = chart.phases.postGreatRecession.scales.y;

    // Re-scale the x axis
    chart.chart.select("#chart-axis-x")
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .call(d3.axisBottom(scaleX));

    // Re-scale the y axis
    chart.chart.select("#chart-axis-y")
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .call(d3.axisLeft(scaleY));

    // Perform the line compression transition
    chart.chart.select("#chart-line-spx")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        .attr("d", d3.line()
            .x((d, i) => chart.phases.greatRecession.scales.x(dateParser(dataDotComBurst[i].Date)))
            .y((d, i) => chart.phases.greatRecession.scales.y(parseFloat(dataDotComBurst[i].Close)))
        )
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataDotComBurst[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataDotComBurst[i].Close)))
        );

    chart.chart.select("#chart-line-spx-2")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        .attr("d", d3.line()
            .x((d, i) => chart.phases.greatRecession.scales.x(dateParser(dataGrowthPeriod2000s[i].Date)))
            .y((d, i) => chart.phases.greatRecession.scales.y(parseFloat(dataGrowthPeriod2000s[i].Close)))
        )
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataGrowthPeriod2000s[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataGrowthPeriod2000s[i].Close)))
        );

    chart.chart.select("#chart-line-spx-3")
        // If the previous slide was still performing a line transition, interrupt it and snap-complete it
        .interrupt()
        .attr("stroke-dashoffset", 0)
        // Perform the line compression transition
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataGreatRecession[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataGreatRecession[i].Close)))
        );

    // Create the extended line
    const pathValueSPX = chart.chart.append("path")
        .datum(dataPostGreatRecession)
        .attr("id", "chart-line-spx-4")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", d3.line()
            .x((d, i) => scaleX(dateParser(dataPostGreatRecession[i].Date)))
            .y((d, i) => scaleY(parseFloat(dataPostGreatRecession[i].Close)))
        );

    // Perform the extended line's entrance transition
    const pathValueSPXLength = pathValueSPX.node().getTotalLength();

    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength)
        .transition()
        .delay(chartTransitionTime)
        .duration(chartTransitionTime * 2)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
}

// Calculate the center point of a chart's x axis
function chartAxisXCenter(chart) {
    return (((chart.width - chart.marginLeft - chart.marginRight) / 2) + chart.marginLeft);
}

// Calculate the center point of a chart's y axis
function chartAxisYCenter(chart) {
    return (((chart.height - chart.marginTop - chart.marginBottom) / 2) + chart.marginTop);
}

// Calculate the center point of a chart's title
function chartTitleCenter(chart) {
    return (chart.width / 2);
}

// Calculate a deterministic, neighbor-distinct color given a position integer
function color(i) {
    return `hsl(${(((i * 139) + 210) % 360)}, 100%, 75%)`;
}