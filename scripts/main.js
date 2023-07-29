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
const pathEntranceTransitionTime = chartTransitionTime * 2;
const annotationEntranceTransitionTime = 500;
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
    scene.loader = [null, loadScene1, loadScene2, loadScene3, loadScene4, loadScene5, loadScene6];

    // Create the historical dataset group
    datasets.historical = {};

    // Create the chart specifications
    charts.pie = {
        selection : null,
        height: canvasHeight,
        width: canvasWidth,
        x : (canvasWidth / 2),
        y : (canvasHeight / 2),
        innerRadius: 150,
        outerRadius: 275,
        markSize : 50,
        tooltip : {
            selection : null
        }
    };

    charts.line = {
        selection : null,
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
            postGreatRecession : {},
            exploration : {}
        },
        tooltip : {
            selection : null
        },
        linearRule : {
            selection : null
        },
        explorationGraph : {
            active : {
                tsla : true,
                spy : true,
                amzn : true,
                aapl : true,
                nvda : true,
                qqq : true,
                googl : true,
                amd : true,
                meta : true,
                msft : true,
                spx : true,
            },
            display : "percent",
            range : {
                begin : new Date("2000-01-01"),
                end : new Date("2023-07-01")
            }
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
    // Create an alias for the chart used by this scene
    const chart = charts.pie;

    // Get the loaded dataset
    const dataset = datasets.popularRetailEquitiesEarly2023;
    const data = dataset.map(a => parseInt(a.RetailNetFlowMillions));
    const retailNetFlowMillionsTotal = data.reduce((accumulator, currentValue) => (accumulator + currentValue), 0);

    // Clear the canvas
    document.getElementById("canvas").replaceChildren();

    // Create the chart element and set its dimensions and position
    chart.selection = canvas.append("g")
        .attr("height", chart.height)
        .attr("width", chart.width)
        .attr("transform", `translate(${chart.x},${chart.y})`);

    // Create the chart title
    const chartTitleGroup = chart.selection.append("g")
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
    const chartGraphGroup = chart.selection.append("g")
        .attr("id", "chart-graph-group");

    chartGraphGroup.selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("fill", (d, i) => color(i))
        .on("mouseover", (e, d) => {
            // Remove tooltip pings if present
            chart.selection.select("#chart-tooltip-ping-group").remove();
            
            // Create the tooltip
            const tooltipContent = `<div style="font-weight:bold;">${dataset[d.index].CompanyName} (${dataset[d.index].Ticker})</div>
                <div>$${d3.format(",")(dataset[d.index].RetailNetFlowMillions)}M (${(dataset[d.index].RetailNetFlowMillions * 100 / retailNetFlowMillionsTotal).toFixed(2)}%)</div>`;
            chart.tooltip.selection = createTooltip(tooltipContent)
                .style("left", `${e.clientX}px`)
                .style("top", `${e.clientY + 22}px`)
        })
        .on("mouseout", () => removeTooltip(chart.tooltip.selection))
        .on("mousemove", e => {
            // Move the tooltip
            chart.tooltip.selection
                .style("left", `${e.clientX}px`)
                .style("top", `${e.clientY + 22}px`)
        })
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
        .attr("pointer-events", "none") // Don't capture mouse events; let them be captured by the object below
        .transition()
        .delay(chartTransitionTime * 0.85)
        .duration(500)
        .attr("opacity", 1.0);

    // Create the text value sum counter
    chartGraphGroup.datum(retailNetFlowMillionsTotal)
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
    const chartTooltipPingGroup = chart.selection.append("g")
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
        .attr("pointer-events", "none") // Don't capture mouse events; let them be captured by the object below
        .transition()
        .delay(chartTransitionTime * 1.5)
        .duration(1000)
        .attr("opacity", 1.0);
}

// Load scene 2
function loadScene2() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.historical.spx === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.historical.spx = dataset;
                renderScene2Canvas();
            });
    
    } else {
        renderScene2Canvas();
    }
}

// Render scene 2's visualization onto the canvas
function renderScene2Canvas() {
    // Create an alias for the chart used by this scene
    const chart = charts.line;

    // Create the dataset subset
    chart.phases.dotComBurst.dateEnd = new Date("2002-09-28");
    chart.phases.dotComBurst.dataSubset = datasets.historical.spx.filter(d => (dateParser(d.Date) <= chart.phases.dotComBurst.dateEnd));
    const dataDotComBurst = chart.phases.dotComBurst.dataSubset;

    // Clear the canvas
    document.getElementById("canvas").replaceChildren();

    // Create the chart (initially invisible)
    chart.selection = canvas.append("g")
        .attr("height", chart.height)
        .attr("width", chart.width)
        .attr("transform", `translate(${chart.x},${chart.y})`)
        .attr("opacity", "0.0");

    // Create the chart title
    const chartTitleGroup = chart.selection.append("g")
        .attr("id", "chart-title-group");

    chartTitleGroup.datum("S&P 500 (SPX) January 2000 - September 2002")
        .append("text")
        .text(d => d)
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartTitleCenter(chart)},${chart.marginTop})`);

    // Create the dot-com burst scales
    chart.phases.dotComBurst.scales = {};

    // Create the x scale
    chart.phases.dotComBurst.scales.x = d3.scaleTime()
        .domain(d3.extent(dataDotComBurst, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale
    chart.phases.dotComBurst.scales.y = d3.scaleLinear()
        .domain([500, 1600])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    // Create the x axis
    chart.selection.append("g")
        .attr("id", "chart-axis-x")
        .attr("transform", `translate(0,${chart.height - chart.marginBottom})`)
        .call(d3.axisBottom(chart.phases.dotComBurst.scales.x))
        // Create the axis label
        .append("text")
        .text("Date")
        .attr("class", "chart-axis-label")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${chartAxisXCenter(chart)},35)`);

    // Create the y axis
    chart.selection.append("g")
        .attr("id", "chart-axis-y")
        .attr("transform", `translate(${chart.marginLeft},0)`)
        .call(d3.axisLeft(chart.phases.dotComBurst.scales.y))
        // Create the axis label
        .append("text")
        .text("Value")
        .attr("class", "chart-axis-label")
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(-50,${chartAxisYCenter(chart)}) rotate(-90)`);

    // Create the chart graph group
    const chartGraphGroup = chart.selection.append("g")
        .attr("id", "chart-graph-group");

    // Create the first SPX path segment
    const pathValueSPX = createPath(chartGraphGroup, "chart-graph-line-spx", dataDotComBurst, chart.phases.dotComBurst.scales, "steelblue");

    const pathValueLengthSPX = pathValueSPX.node().getTotalLength();
    pathValueSPX.attr("stroke-dashoffset", pathValueLengthSPX)
        .attr("stroke-dasharray", pathValueLengthSPX);

    // Create the tooltip hitbox
    const chartGraphTooltipHitbox = chart.selection.append("g")
        .attr("id", "chart-graph-tooltip-hitbox-group");

    chartGraphTooltipHitbox.append("rect")
        .attr("id", "chart-tooltip-hitbox")
        .attr("width", (chart.width - chart.marginRight - chart.marginLeft))
        .attr("height", (chart.height - chart.marginBottom - chart.marginTop))
        .attr("x", chart.marginLeft)
        .attr("y", chart.marginTop)
        .attr("opacity", "0.0")
        .on("mouseover", e => createStockChartSPXTooltip(e, chart, dataDotComBurst))
        .on("mouseout", () => {
            // Remove the tooltip and vertical rule
            removeTooltip(chart.tooltip.selection);
            removeLinearRule(chart.linearRule.selection);
        })
        .on("mousemove", e => moveStockChartSPXTooltip(e, chart, dataDotComBurst));

    // Create the annotations
    const chartAnnotationsGroup = chart.selection.append("g")
        .attr("id", "chart-annotations-group");
    
    const annotation0 = createAnnotation(chartAnnotationsGroup,
        chart.phases.dotComBurst.scales.x(storyContent.annotations[0].position.x),
        chart.phases.dotComBurst.scales.y(storyContent.annotations[0].position.y),
        410,
        storyContent.annotations[0].textLines,
        "bottomright")
        .attr("id", "chart-annotation-0")
        .attr("opacity", "0.0");

    const annotation1 = createAnnotation(chartAnnotationsGroup,
        chart.phases.dotComBurst.scales.x(storyContent.annotations[1].position.x),
        chart.phases.dotComBurst.scales.y(storyContent.annotations[1].position.y),
        400,
        storyContent.annotations[1].textLines,
        "topleft")
        .attr("id", "chart-annotation-1")
        .attr("opacity", "0.0");

    // Perform the chart's entrance transition
    chart.selection.transition()
        .duration(sceneTransitionTime)
        .ease(d3.easeLinear)
        .attr("opacity", "1.0");

    let delayTime = sceneTransitionTime;
        
    // Perform the new path's entrance transition
    performPathEntranceTransition(pathValueSPX, pathEntranceTransitionTime, delayTime);
    delayTime += pathEntranceTransitionTime;

    // Perform the annotations' entrance transitions
    performAnnotationEntranceTransition(annotation0, annotationEntranceTransitionTime, delayTime);
    performAnnotationEntranceTransition(annotation1, annotationEntranceTransitionTime, delayTime);

}

// Load scene 3
function loadScene3() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.historical.spx === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.historical.spx = dataset;
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
    chart.phases.growthPeriod2000s.dateEnd = new Date("2007-10-06");
    chart.phases.growthPeriod2000s.dataSubset = datasets.historical.spx.filter(d => ((dateParser(d.Date) >= chart.phases.dotComBurst.dateEnd) && (dateParser(d.Date) <= chart.phases.growthPeriod2000s.dateEnd)));
    const dataSubsetCurrentRange = datasets.historical.spx.filter(d => (dateParser(d.Date) <= chart.phases.growthPeriod2000s.dateEnd));

    // Create the 2000s growth period scales
    chart.phases.growthPeriod2000s.scales = {};

    // Update the chart title
    const chartTitleGroup = chart.selection.select("#chart-title-group");

    chartTitleGroup.selectAll("text")
        .datum("S&P 500 (SPX) January 2000 - Early October 2007")
        .text(d => d);

    // Create the x scale
    chart.phases.growthPeriod2000s.scales.x = d3.scaleTime()
        .domain(d3.extent(dataSubsetCurrentRange, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale (this should be the same as the previous phase)
    chart.phases.growthPeriod2000s.scales.y = chart.phases.dotComBurst.scales.y;

    // Rescale the x axis
    performAxisRescalingTransition(chart.selection.select("#chart-axis-x"), d3.axisBottom, chart.phases.growthPeriod2000s.scales.x, chartTransitionTime);

    // Update the tooltip parameters
    chart.selection.select("#chart-graph-tooltip-hitbox-group")
        .selectAll("rect")
        .on("mouseover", e => createStockChartSPXTooltip(e, chart, dataSubsetCurrentRange))
        .on("mouseout", () => {
            // Remove the tooltip and vertical rule
            removeTooltip(chart.tooltip.selection);
            removeLinearRule(chart.linearRule.selection);
        })
        .on("mousemove", e => moveStockChartSPXTooltip(e, chart, dataSubsetCurrentRange));

    // Perform the line compression transition
    const chartGraphGroup = chart.selection.select("#chart-graph-group");

    performPathRescalingTransition(chartGraphGroup.select("#chart-graph-line-spx"),
        chart.phases.dotComBurst.dataSubset,
        chart.phases.dotComBurst.scales,
        chart.phases.growthPeriod2000s.scales,
        chartTransitionTime);

    let delayTime = chartTransitionTime;

    // Perform the annotation position shift transition
    performAnnotationReposition(chart.selection.select("#chart-annotation-0"),
        chart.phases.dotComBurst.scales.x(storyContent.annotations[0].position.x),
        chart.phases.dotComBurst.scales.y(storyContent.annotations[0].position.y),
        chart.phases.growthPeriod2000s.scales.x(storyContent.annotations[0].position.x),
        chart.phases.growthPeriod2000s.scales.y(storyContent.annotations[0].position.y),
        chartTransitionTime);

    performAnnotationReposition(chart.selection.select("#chart-annotation-1"),
        chart.phases.dotComBurst.scales.x(storyContent.annotations[1].position.x),
        chart.phases.dotComBurst.scales.y(storyContent.annotations[1].position.y),
        chart.phases.growthPeriod2000s.scales.x(storyContent.annotations[1].position.x),
        chart.phases.growthPeriod2000s.scales.y(storyContent.annotations[1].position.y),
        chartTransitionTime);

    // Create the extended path
    const pathValueSPX = createPath(chartGraphGroup, "chart-graph-line-spx-2", chart.phases.growthPeriod2000s.dataSubset, chart.phases.growthPeriod2000s.scales, "steelblue");

    const pathValueSPXLength = pathValueSPX.node().getTotalLength();
    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength);
    
    // Create the annotation
    const annotation2 = createAnnotation(chart.selection.select("#chart-annotations-group"),
        chart.phases.growthPeriod2000s.scales.x(storyContent.annotations[2].position.x),
        chart.phases.growthPeriod2000s.scales.y(storyContent.annotations[2].position.y),
        410,
        storyContent.annotations[2].textLines,
        "bottomleft")
        .attr("id", "chart-annotation-2")
        .attr("opacity", "0.0");

    // Perform the extended line's entrance transition
    performPathEntranceTransition(pathValueSPX, pathEntranceTransitionTime, delayTime);
    delayTime += pathEntranceTransitionTime;

    // Perform the annotation entrance transition
    performAnnotationEntranceTransition(annotation2, annotationEntranceTransitionTime, delayTime);
}

// Load scene 4
function loadScene4() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.historical.spx === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.historical.spx = dataset;
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
    chart.phases.greatRecession.dataSubset = datasets.historical.spx.filter(d => ((dateParser(d.Date) >= chart.phases.growthPeriod2000s.dateEnd) && (dateParser(d.Date) <= chart.phases.greatRecession.dateEnd)));
    const dataSubsetCurrentRange = datasets.historical.spx.filter(d => (dateParser(d.Date) <= chart.phases.greatRecession.dateEnd));

    // Create the great recession scales
    chart.phases.greatRecession.scales = {};

    // Update the chart title
    const chartTitleGroup = chart.selection.select("#chart-title-group");

    chartTitleGroup.selectAll("text")
        .datum("S&P 500 (SPX) January 2000 - February 2009")
        .text(d => d);

    // Create the x scale
    chart.phases.greatRecession.scales.x = d3.scaleTime()
        .domain(d3.extent(dataSubsetCurrentRange, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale (this should be the same as the previous two phases)
    chart.phases.greatRecession.scales.y = chart.phases.dotComBurst.scales.y;

    // Rescale the x axis
    performAxisRescalingTransition(chart.selection.select("#chart-axis-x"), d3.axisBottom, chart.phases.greatRecession.scales.x, chartTransitionTime);

    // Update the tooltip hitbox
    chart.selection.select("#chart-graph-tooltip-hitbox-group")
        .selectAll("rect")
        .on("mouseover", e => createStockChartSPXTooltip(e, chart, dataSubsetCurrentRange))
        .on("mouseout", () => {
            // Remove the tooltip and vertical rule
            removeTooltip(chart.tooltip.selection);
            removeLinearRule(chart.linearRule.selection);
        })
        .on("mousemove", e => moveStockChartSPXTooltip(e, chart, dataSubsetCurrentRange));

    // Perform the line compression transition
    const chartGraphGroup = chart.selection.select("#chart-graph-group");

    performPathRescalingTransition(chartGraphGroup.select("#chart-graph-line-spx"),
        chart.phases.dotComBurst.dataSubset,
        chart.phases.growthPeriod2000s.scales,
        chart.phases.greatRecession.scales,
        chartTransitionTime);

    performPathRescalingTransition(chartGraphGroup.select("#chart-graph-line-spx-2"),
        chart.phases.growthPeriod2000s.dataSubset,
        chart.phases.growthPeriod2000s.scales,
        chart.phases.greatRecession.scales,
        chartTransitionTime);

    let delayTime = chartTransitionTime;

    // Perform the annotation position shift transition
    performAnnotationReposition(chart.selection.select("#chart-annotation-0"),
        chart.phases.growthPeriod2000s.scales.x(storyContent.annotations[0].position.x),
        chart.phases.growthPeriod2000s.scales.y(storyContent.annotations[0].position.y),
        chart.phases.greatRecession.scales.x(storyContent.annotations[0].position.x),
        chart.phases.greatRecession.scales.y(storyContent.annotations[0].position.y),
        chartTransitionTime);

    performAnnotationReposition(chart.selection.select("#chart-annotation-1"),
        chart.phases.growthPeriod2000s.scales.x(storyContent.annotations[1].position.x),
        chart.phases.growthPeriod2000s.scales.y(storyContent.annotations[1].position.y),
        chart.phases.greatRecession.scales.x(storyContent.annotations[1].position.x),
        chart.phases.greatRecession.scales.y(storyContent.annotations[1].position.y),
        chartTransitionTime);

    performAnnotationReposition(chart.selection.select("#chart-annotation-2"),
        chart.phases.growthPeriod2000s.scales.x(storyContent.annotations[2].position.x),
        chart.phases.growthPeriod2000s.scales.y(storyContent.annotations[2].position.y),
        chart.phases.greatRecession.scales.x(storyContent.annotations[2].position.x),
        chart.phases.greatRecession.scales.y(storyContent.annotations[2].position.y),
        chartTransitionTime);

    // Create the extended path
    const pathValueSPX = createPath(chartGraphGroup, "chart-graph-line-spx-3", chart.phases.greatRecession.dataSubset, chart.phases.greatRecession.scales, "steelblue");

    const pathValueSPXLength = pathValueSPX.node().getTotalLength();
    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength);

    // Create the annotation
    const annotation3 = createAnnotation(chart.selection.select("#chart-annotations-group"),
        chart.phases.greatRecession.scales.x(storyContent.annotations[3].position.x),
        chart.phases.greatRecession.scales.y(storyContent.annotations[3].position.y),
        25,
        storyContent.annotations[3].textLines,
        "bottomleft")
        .attr("id", "chart-annotation-3")
        .attr("opacity", "0.0");
        
    // Perform the extended line's entrance transition
    performPathEntranceTransition(pathValueSPX, pathEntranceTransitionTime, chartTransitionTime);
    delayTime += pathEntranceTransitionTime;

    // Perform the annotation entrance transition
    performAnnotationEntranceTransition(annotation3, annotationEntranceTransitionTime, delayTime);
}

// Load scene 5
function loadScene5() {
    // Load the required dataset if it has not yet been loaded
    if(datasets.historical.spx === undefined) {
        d3.csv("./data/spx-historical.csv")
            .then(dataset => {
                datasets.historical.spx = dataset;
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
    const dataPostGreatRecession = datasets.historical.spx.filter(d => (dateParser(d.Date) >= chart.phases.greatRecession.dateEnd));

    // Create the great recession scales
    chart.phases.postGreatRecession.scales = {};

    // Update the chart title
    const chartTitleGroup = chart.selection.select("#chart-title-group");

    chartTitleGroup.selectAll("text")
        .datum("S&P 500 (SPX) January 2000 - June 2023")
        .text(d => d);

    // Create the x scale
    chart.phases.postGreatRecession.scales.x = d3.scaleTime()
        .domain(d3.extent(datasets.historical.spx, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale (this scale differs from the previous three scenes)
    chart.phases.postGreatRecession.scales.y = d3.scaleLinear()
        .domain([600, 5000])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    // Fade out, delete, and then recreate the previous annotations after the large rescaling is performed
    const chartAnnotationsGroup = chart.selection.select("#chart-annotations-group");

    chartAnnotationsGroup
        .interrupt()
        .attr("opacity", "1.0")
        .transition()
        .duration(annotationEntranceTransitionTime)
        .attr("opacity", "0.0")
        .selectAll("g")
        .remove();
    
    chartAnnotationsGroup
        .transition()
        .delay(annotationEntranceTransitionTime)
        .attr("opacity", "1.0");

    const annotation0 = createAnnotation(chartAnnotationsGroup,
        chart.phases.postGreatRecession.scales.x(storyContent.annotations[0].position.x),
        chart.phases.postGreatRecession.scales.y(storyContent.annotations[0].position.y),
        400,
        storyContent.annotations[0].textLines,
        "topright")
        .attr("id", "chart-annotation-0")
        .attr("opacity", "0.0");

    const annotation1 = createAnnotation(chartAnnotationsGroup,
        chart.phases.postGreatRecession.scales.x(storyContent.annotations[1].position.x),
        chart.phases.postGreatRecession.scales.y(storyContent.annotations[1].position.y),
        400,
        storyContent.annotations[1].textLines,
        "topright")
        .attr("id", "chart-annotation-1")
        .attr("opacity", "0.0");

    const annotation2 = createAnnotation(chartAnnotationsGroup,
        chart.phases.postGreatRecession.scales.x(storyContent.annotations[2].position.x),
        chart.phases.postGreatRecession.scales.y(storyContent.annotations[2].position.y),
        165,
        storyContent.annotations[2].textLines,
        "topright")
        .attr("id", "chart-annotation-2")
        .attr("opacity", "0.0");

    const annotation3 = createAnnotation(chartAnnotationsGroup,
        chart.phases.postGreatRecession.scales.x(storyContent.annotations[3].position.x),
        chart.phases.postGreatRecession.scales.y(storyContent.annotations[3].position.y),
        225,
        storyContent.annotations[3].textLines,
        "topright")
        .attr("id", "chart-annotation-3")
        .attr("opacity", "0.0");

    const annotation4 = createAnnotation(chartAnnotationsGroup,
        chart.phases.postGreatRecession.scales.x(storyContent.annotations[4].position.x),
        chart.phases.postGreatRecession.scales.y(storyContent.annotations[4].position.y),
        80,
        storyContent.annotations[4].textLines,
        "bottomleft")
        .attr("id", "chart-annotation-4")
        .attr("opacity", "0.0");

    const annotation5 = createAnnotation(chartAnnotationsGroup,
        chart.phases.postGreatRecession.scales.x(storyContent.annotations[5].position.x),
        chart.phases.postGreatRecession.scales.y(storyContent.annotations[5].position.y),
        540,
        storyContent.annotations[5].textLines,
        "bottomleft")
        .attr("id", "chart-annotation-5")
        .attr("opacity", "0.0");

    const annotation6 = createAnnotation(chartAnnotationsGroup,
        chart.phases.postGreatRecession.scales.x(storyContent.annotations[6].position.x),
        chart.phases.postGreatRecession.scales.y(storyContent.annotations[6].position.y),
        560,
        storyContent.annotations[6].textLines,
        "bottomleft")
        .attr("id", "chart-annotation-6")
        .attr("opacity", "0.0");

    // Rescale the x and y axes
    performAxisRescalingTransition(chart.selection.select("#chart-axis-x"), d3.axisBottom, chart.phases.postGreatRecession.scales.x, chartTransitionTime, 0);
    performAxisRescalingTransition(chart.selection.select("#chart-axis-y"), d3.axisLeft, chart.phases.postGreatRecession.scales.y, chartTransitionTime, 0);

    let delayTime = chartTransitionTime;

    // Update the tooltip hitbox
    chart.selection.select("#chart-graph-tooltip-hitbox-group")
        .selectAll("rect")
        .on("mouseover", e => createStockChartSPXTooltip(e, chart, datasets.historical.spx))
        .on("mouseout", () => {
            // Remove the tooltip and vertical rule
            removeTooltip(chart.tooltip.selection);
            removeLinearRule(chart.linearRule.selection);
        })
        .on("mousemove", e => moveStockChartSPXTooltip(e, chart, datasets.historical.spx));    

    // Perform the line compression transition
    const chartGraphGroup = chart.selection.select("#chart-graph-group");

    performPathRescalingTransition(chartGraphGroup.select("#chart-graph-line-spx"),
        chart.phases.dotComBurst.dataSubset,
        chart.phases.greatRecession.scales,
        chart.phases.postGreatRecession.scales,
        chartTransitionTime);

    performPathRescalingTransition(chartGraphGroup.select("#chart-graph-line-spx-2"),
        chart.phases.growthPeriod2000s.dataSubset,
        chart.phases.greatRecession.scales,
        chart.phases.postGreatRecession.scales,
        chartTransitionTime);

    performPathRescalingTransition(chartGraphGroup.select("#chart-graph-line-spx-3"),
        chart.phases.greatRecession.dataSubset,
        chart.phases.greatRecession.scales,
        chart.phases.postGreatRecession.scales,
        chartTransitionTime);

    // Create the extended path
    const pathValueSPX = createPath(chartGraphGroup, "chart-graph-line-spx-4", dataPostGreatRecession, chart.phases.postGreatRecession.scales, "steelblue");

    const pathValueSPXLength = pathValueSPX.node().getTotalLength();
    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength);

    // Perform the extended line's entrance transition
    performPathEntranceTransition(pathValueSPX, pathEntranceTransitionTime, chartTransitionTime);
    delayTime += pathEntranceTransitionTime;

    // Perform the annotation (re)entrance transition
    performAnnotationEntranceTransition(annotation0, annotationEntranceTransitionTime, delayTime);
    performAnnotationEntranceTransition(annotation1, annotationEntranceTransitionTime, delayTime);
    performAnnotationEntranceTransition(annotation2, annotationEntranceTransitionTime, delayTime);
    performAnnotationEntranceTransition(annotation3, annotationEntranceTransitionTime, delayTime);
    performAnnotationEntranceTransition(annotation4, annotationEntranceTransitionTime, delayTime);
    performAnnotationEntranceTransition(annotation5, annotationEntranceTransitionTime, delayTime);
    performAnnotationEntranceTransition(annotation6, annotationEntranceTransitionTime, delayTime);
}

// Load scene 6
function loadScene6() {
    // Load the required datasets if they have not yet been loaded
    const promises = [];

    // SPX historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.spx === undefined) {
            d3.csv("./data/spx-historical.csv")
                .then(dataset => {
                    datasets.historical.spx = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // TSLA historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.tsla === undefined) {
            d3.csv("./data/tsla-historical.csv")
                .then(dataset => {
                    datasets.historical.tsla = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // AAPL historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.aapl === undefined) {
            d3.csv("./data/aapl-historical.csv")
                .then(dataset => {
                    datasets.historical.aapl = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // SPY historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.spy === undefined) {
            d3.csv("./data/spy-historical.csv")
                .then(dataset => {
                    datasets.historical.spy = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // AMZN historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.amzn === undefined) {
            d3.csv("./data/amzn-historical.csv")
                .then(dataset => {
                    datasets.historical.amzn = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // NVDA historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.nvda === undefined) {
            d3.csv("./data/nvda-historical.csv")
                .then(dataset => {
                    datasets.historical.nvda = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // QQQ historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.qqq === undefined) {
            d3.csv("./data/qqq-historical.csv")
                .then(dataset => {
                    datasets.historical.qqq = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // GOOGL historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.googl === undefined) {
            d3.csv("./data/googl-historical.csv")
                .then(dataset => {
                    datasets.historical.googl = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // AMD historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.amd === undefined) {
            d3.csv("./data/amd-historical.csv")
                .then(dataset => {
                    datasets.historical.amd = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // META historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.meta === undefined) {
            d3.csv("./data/meta-historical.csv")
                .then(dataset => {
                    datasets.historical.meta = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    // MSFT historical dataset
    promises.push(new Promise((resolve) => {
        if(datasets.historical.msft === undefined) {
            d3.csv("./data/msft-historical.csv")
                .then(dataset => {
                    datasets.historical.msft = dataset;
                    resolve();
                });
        
        } else {
            resolve();
        }
    }));

    Promise.all(promises).then(() => {
        renderScene6Canvas();
    });
}

// Render scene 6's visualization onto the canvas
function renderScene6Canvas() {
    // Declare the chart and its attributes
    const chart = charts.line;

    // Create the exploration scales
    chart.phases.exploration.scales = {};

    // Create the x scale (initially, this will be the full date range of the dataset)
    chart.phases.exploration.scales.x = chart.phases.postGreatRecession.scales.x;

    // Create the y scale
    chart.phases.exploration.scales.y = d3.scaleLinear()
        .domain(getExtentYAxis(datasets.historical, chart.explorationGraph.active))
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    // Update the chart title
    const chartTitleGroup = chart.selection.select("#chart-title-group");

    chartTitleGroup.selectAll("text")
        .datum("Retail Investors' Top Picks January 2000 - June 2023")
        .text(d => d);

    // Clear any existing pre-existing graph content
    const chartGraphGroup = chart.selection.select("#chart-graph-group");
    chartGraphGroup.selectAll("path").remove();

    // Fade out the annotations group and mark them as initially deselected
    const chartAnnotationsGroup = chart.selection.select("#chart-annotations-group");

    chartAnnotationsGroup
        .interrupt()
        .attr("opacity", "1.0")
        .transition()
        .duration(annotationEntranceTransitionTime)
        .attr("opacity", "0.0")

    chartAnnotationsGroup
        .transition()
        .delay(annotationEntranceTransitionTime)
        .duration(0)
        .style("display", "none")
        .attr("opacity", "1.0");

    // Rescale the x and y axes
    performAxisRescalingTransition(chart.selection.select("#chart-axis-x"), d3.axisBottom, chart.phases.exploration.scales.x, chartTransitionTime, 0);
    performAxisRescalingTransition(chart.selection.select("#chart-axis-y"), d3.axisLeft, chart.phases.exploration.scales.y, chartTransitionTime, 0);
    
    // Update the tooltip hitbox
    chart.selection.select("#chart-graph-tooltip-hitbox-group")
    .selectAll("rect")
    .on("mouseover", e => createStockChartExplorationTooltip(e, chart, datasets.historical, chart.explorationGraph.active))
    .on("mouseout", () => {
        // Remove the tooltip and vertical rule
        removeTooltip(chart.tooltip.selection);
        removeLinearRule(chart.linearRule.selection);
    })
    .on("mousemove", e => moveStockChartExplorationTooltip(e, chart, datasets.historical, chart.explorationGraph.active));    

    // Snap re-draw the SPX graph as a single path
    const pathValueSPX = createPath(chartGraphGroup, "chart-graph-line-spx", datasets.historical.spx, chart.phases.postGreatRecession.scales, "steelblue");
    
    performPathRescalingTransition(pathValueSPX,
        datasets.historical.spx,
        chart.phases.postGreatRecession.scales,
        chart.phases.exploration.scales,
        chartTransitionTime);
    
    const pathValueTSLA = createPath(chartGraphGroup, "chart-graph-line-tsla", datasets.historical.tsla, chart.phases.exploration.scales, color(0));
    const pathValueSPY = createPath(chartGraphGroup, "chart-graph-line-spy", datasets.historical.spy, chart.phases.exploration.scales, color(1));
    const pathValueAMZN = createPath(chartGraphGroup, "chart-graph-line-amzn", datasets.historical.amzn, chart.phases.exploration.scales, color(2));
    const pathValueAAPL = createPath(chartGraphGroup, "chart-graph-line-aapl", datasets.historical.aapl, chart.phases.exploration.scales, color(3));
    const pathValueNVDA = createPath(chartGraphGroup, "chart-graph-line-nvda", datasets.historical.nvda, chart.phases.exploration.scales, color(4));
    const pathValueQQQ = createPath(chartGraphGroup, "chart-graph-line-qqq", datasets.historical.qqq, chart.phases.exploration.scales, color(5));
    const pathValueGOOGL = createPath(chartGraphGroup, "chart-graph-line-googl", datasets.historical.googl, chart.phases.exploration.scales, color(6));
    const pathValueAMD = createPath(chartGraphGroup, "chart-graph-line-amd", datasets.historical.amd, chart.phases.exploration.scales, color(7));
    const pathValueMETA = createPath(chartGraphGroup, "chart-graph-line-meta", datasets.historical.meta, chart.phases.exploration.scales, color(8));
    const pathValueMSFT = createPath(chartGraphGroup, "chart-graph-line-msft", datasets.historical.msft, chart.phases.exploration.scales, color(9));

    // Add the controls to the story frame
    const storyContainerSelection = d3.select(storyContainer).append("p").append("form");

    // Add line filter controls
    storyContainerSelection.append("div")
        .text("Equities")
        .classed("story-control-group-header", true);

    let i = 0;
    for(let equity of datasets.popularRetailEquitiesEarly2023) {
        createStockLineControl(storyContainerSelection, chart, datasets.historical, equity, color(i++));
    }

    createStockLineControl(storyContainerSelection, chart, datasets.historical, {CompanyName : "S&P 500", Ticker : "SPX"}, "steelblue");

    // Add date range controls
    storyContainerSelection.append("div")
        .text("Date Range")
        .classed("story-control-group-header", true);

    createStockDateRangeControl(storyContainerSelection);
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
    if(i == 10) {
        // Cheat the algorithm for our preferred SPX color
        return "steelblue";
    }

    return `hsl(${(((i * 139) + 210) % 360)}, 100%, 75%)`;
}

// Create a tooltip
function createTooltip(tooltipContent) {
    return d3.select("body")
        .append("div")
        .classed("tooltip", true)
        .html(tooltipContent);
}

// Remove a tooltip
function removeTooltip(tooltip) {
    tooltip.remove();
}

// Create a linear rule
function createLinearRule(chartSelection) {
    return chartSelection.append("path")
        .attr("pointer-events", "none")
        .attr("fill", "none")
        .attr("stroke", "#aaa")
        .attr("stroke-width", "1");
}

// Remove a linear rule
function removeLinearRule(rule) {
    rule.remove();
}

// Perform an animated path entrance transition
function performPathEntranceTransition(pathSelection, durationTime, delayTime) {
    return pathSelection
        .transition()
        .delay(delayTime)
        .duration(durationTime)
        .ease(d3.easeQuadOut)
        .attr("stroke-dashoffset", 0);
}

// Perform an animated path rescaling
function performPathRescalingTransition(pathSelection, dataset, scalesBegin, scalesEnd, durationTime) {
    return pathSelection
    // If the previous slide was still performing a line transition, interrupt it and snap-complete it  
    .interrupt()
    .attr("stroke-dashoffset", 0)
    .attr("d", d3.line()
        .x((d, i) => scalesBegin.x(dateParser(dataset[i].Date)))
        .y((d, i) => scalesBegin.y(parseFloat(dataset[i].Close)))
    )
    // Perform the line compression transition
    .transition()
    .duration(durationTime)
    .ease(d3.easeCubic)
    .attr("d", d3.line()
        .x((d, i) => scalesEnd.x(dateParser(dataset[i].Date)))
        .y((d, i) => scalesEnd.y(parseFloat(dataset[i].Close)))
    );
}

// Perform an animated axis rescaling
function performAxisRescalingTransition(axisSelection, axisOrientation, scaleNew, durationTime, delayTime) {
    return axisSelection
        .interrupt()
        .transition()
        .delay(delayTime)
        .duration(durationTime)
        .ease(d3.easeCubic)
        .call(axisOrientation(scaleNew));
}

// Create a path
function createPath(containerSelection, id, dataset, scales, color) {
    return containerSelection.append("path")
    .datum(dataset)
    .attr("id", id)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", "1.5px")
    .attr("d", d3.line()
        .x((d, i) => scales.x(dateParser(dataset[i].Date)))
        .y((d, i) => scales.y(parseFloat(dataset[i].Close)))
    );
}

// Create the SPX stock chart tooltip
function createStockChartSPXTooltip(e, chart, dataset) {
    // Create the tooltip box
    const DateSegmentWidth = ((chart.width - chart.marginRight - chart.marginLeft) / dataset.length);
    const canvasPointerX = d3.pointer(e)[0];
    const closestXPoint = Math.max(Math.min(Math.round((canvasPointerX - chart.marginLeft - (DateSegmentWidth / 2)) / DateSegmentWidth), (dataset.length - 1)), 0);

    const tooltipContent = `<div style="font-weight:bold;">Week ending on ${dataset[closestXPoint].Date}</div>
        <div><span class="ticker" style="color:steelblue;">${dataset[closestXPoint].Ticker}</span>: $${d3.format(",.2f")(dataset[closestXPoint].Close)}</div>`;
    
    chart.tooltip.selection = createTooltip(tooltipContent)
        .style("left", `${e.clientX}px`)
        .style("top", `${100}px`);

    // Create the tooltip vertical rule
    chart.linearRule.selection = createLinearRule(chart.selection)
        .attr("d", `M${canvasPointerX},${chart.marginTop}L${canvasPointerX},${chart.height - chart.marginTop}`);
}

// Move the SPX stock chart tooltip to the cursor location
function moveStockChartSPXTooltip(e, chart, dataset) {
    // Move the tooltip and update it content
    const DateSegmentWidth = ((chart.width - chart.marginRight - chart.marginLeft) / dataset.length);
    const canvasPointerX = d3.pointer(e)[0];
    const closestXPoint = Math.max(Math.min(Math.round((canvasPointerX - chart.marginLeft - (DateSegmentWidth / 2)) / DateSegmentWidth), (dataset.length - 1)), 0);

    const tooltipContent = `<div style="font-weight:bold;">Week ending on ${dataset[closestXPoint].Date}</div>
        <div><span class="ticker" style="color:steelblue;">${dataset[closestXPoint].Ticker}</span>: $${d3.format(",.2f")(dataset[closestXPoint].Close)}</div>`;

    chart.tooltip.selection
        .style("left", `${e.clientX}px`)
        .style("top", `${100}px`)
        .node()
        .innerHTML = tooltipContent;

    // Move the tooltip vertical rule
    chart.linearRule.selection
        .attr("d", `M${canvasPointerX},${chart.marginTop}L${canvasPointerX},${chart.height - chart.marginTop}`);
}

// Create the exploration stock chart tooltip
function createStockChartExplorationTooltip(e, chart, datasets, datasetsActiveState) {
    // Create the tooltip box
    const dataPointCount = datasets["spx"].length;
    const DateSegmentWidth = ((chart.width - chart.marginRight - chart.marginLeft) / dataPointCount);
    const canvasPointerX = d3.pointer(e)[0];
    const closestXPoint = Math.max(Math.min(Math.round((canvasPointerX - chart.marginLeft - (DateSegmentWidth / 2)) / DateSegmentWidth), (dataPointCount - 1)), 0);

    let tooltipContent = `<div style="font-weight:bold;">Week ending on ${datasets["spx"][closestXPoint].Date}</div>`

    const keys = Object.keys(datasetsActiveState);

    for(let i = 0; i < keys.length; ++i) {
        const key = keys[i];

        if(datasetsActiveState[key]) {
            const listingOffsetIndex = closestXPoint - (dataPointCount - datasets[key].length);

            if(listingOffsetIndex >= 0) {
                tooltipContent += `<div><span class="ticker" style="color:${color(i)};">${datasets[key][listingOffsetIndex].Ticker}</span>: $${d3.format(",.2f")(datasets[key][listingOffsetIndex].Close)}</div>`;
            }
        }
    }
    
    chart.tooltip.selection = createTooltip(tooltipContent)
        .style("left", `${e.clientX}px`)
        .style("top", `${100}px`);

    // Create the tooltip vertical rule
    chart.linearRule.selection = createLinearRule(chart.selection)
        .attr("d", `M${canvasPointerX},${chart.marginTop}L${canvasPointerX},${chart.height - chart.marginTop}`);
}

// Move the exploration stock chart tooltip
function moveStockChartExplorationTooltip(e, chart, datasets, datasetsActiveState) {
    // Move the tooltip box
    const dataPointCount = datasets["spx"].length;
    const DateSegmentWidth = ((chart.width - chart.marginRight - chart.marginLeft) / dataPointCount);
    const canvasPointerX = d3.pointer(e)[0];
    const closestXPoint = Math.max(Math.min(Math.round((canvasPointerX - chart.marginLeft - (DateSegmentWidth / 2)) / DateSegmentWidth), (dataPointCount - 1)), 0);

    let tooltipContent = `<div style="font-weight:bold;">Week ending on ${datasets["spx"][closestXPoint].Date}</div>`

    const keys = Object.keys(datasetsActiveState);

    for(let i = 0; i < keys.length; ++i) {
        const key = keys[i];

        if(datasetsActiveState[key]) {
            const listingOffsetIndex = closestXPoint - (dataPointCount - datasets[key].length);

            if(listingOffsetIndex >= 0) {
                tooltipContent += `<div><span class="ticker" style="color:${color(i)};">${datasets[key][listingOffsetIndex].Ticker}</span>: $${d3.format(",.2f")(datasets[key][listingOffsetIndex].Close)}</div>`;
            }
        }
    }
    
    chart.tooltip.selection
        .style("left", `${e.clientX}px`)
        .style("top", `${100}px`)
        .node()
        .innerHTML = tooltipContent;

    // Move the tooltip vertical rule
    chart.linearRule.selection
        .attr("d", `M${canvasPointerX},${chart.marginTop}L${canvasPointerX},${chart.height - chart.marginTop}`);
}

// Create annotation
function createAnnotation(containerSelection, x, y, offsetY, textLines, position = "bottomright") {
    // Determine inversions based upon the direction; default is "bottomright"
    const width = 180;
    const textHeight = 17;
    const textIndent = 2;
    const markRadius = 5;

    let textOffsetX = textIndent;
    let textOffsetY = offsetY;
    let textCradleBarX = 0;
    let textCradleBarY = offsetY;
    let directionMultiplierY = 1;

    // Create this annotation's group
    const annotationGroup = containerSelection.append("g");

    // Create the mark
    annotationGroup.append("circle")
        .attr("pointer-events", "none")
        .attr("r", markRadius)
        .attr("fill", "none")
        .attr("stroke", "#333")
        .attr("stroke-width", "2")
        .attr("cx", 0)
        .attr("cy", 0);
        
    // Create the mark pointer
    const markPointer = annotationGroup.append("path")
        .attr("pointer-events", "none")
        .attr("fill", "none")
        .attr("stroke", "#333")
        .attr("stroke-width", "1")
        .attr("stroke-dasharray", "2");

    // Create the text cradle bar
    const textCradleBar = annotationGroup.append("path")
        .attr("pointer-events", "none")
        .attr("fill", "none")
        .attr("stroke", "#333")
        .attr("d", `M0,${offsetY}L${width},${offsetY}`);

    // Create the text content
    const textGroup = annotationGroup.append("g");

    for(let i = 0; i < textLines.length; ++i) {
        textGroup.append("text")
            .text(textLines[i])
            .attr("pointer-events", "none")
            .attr("fill", "#333")
            .attr("transform", `translate(0,${textHeight * (i + 1)})`);
    }
    
    // Invert x coordinates if necessary
    if((position === "bottomleft") || (position === "topleft")) {
        textCradleBarX = (width * -1);
        textOffsetX = (width * -1) + textIndent;
    }

    // Invert y coordinates if necessary
    if((position === "topright") || (position === "topleft")) {
        directionMultiplierY = -1;
        textCradleBarY = (offsetY * -1);
        textOffsetY = (offsetY * -1) - (textHeight * textLines.length) - (textHeight / 2);
    }

    // Set annotation element positions based upon the position
    annotationGroup.attr("transform", `translate(${x},${y})`);
    markPointer.attr("d", `M0,${textCradleBarY}L0,${directionMultiplierY * markRadius}`);
    textCradleBar.attr("d", `M${textCradleBarX},${textCradleBarY}L${textCradleBarX + width},${textCradleBarY}`);
    textGroup.attr("transform", `translate(${textOffsetX},${textOffsetY})`);

    return annotationGroup;
}

// Perform an annotation repositioning
function performAnnotationReposition(annotationSelection, beginX, beginY, endX, endY, durationTime) {
    return annotationSelection
        // If the previous slide was still performing an annotation transition, interrupt it and snap-complete it
        .interrupt()
        .attr("opacity", "1.0")
        .attr("transform", `translate(${beginX},${beginY})`)
        // Perform the annotation transition
        .transition()
        .duration(durationTime)
        .ease(d3.easeCubic)
        .attr("transform", `translate(${endX},${endY})`);
}

// Perform an annotation entrance transition
function performAnnotationEntranceTransition(annotationSelection, durationTime, delayTime) {
    return annotationSelection
        .transition()
        .delay(delayTime)
        .duration(durationTime)
        .attr("opacity", "1.0");
}

// Create a stock line control checkbox
function createStockLineControl(storyContainerSelection, chart, datasets, equity, color) {
    const tickerContainer = storyContainerSelection.append("div");
    const tickerLowerCase = equity.Ticker.toLowerCase();

    tickerContainer.append("input")
        .attr("type", "checkbox")
        .attr("id", `control-ticker-${tickerLowerCase}`)
        .attr("checked", true)
        .on("change", e => {
            const line = chart.selection.select(`#chart-graph-line-${tickerLowerCase}`);
            if(e.target.checked) {
                // Set the line to 1 opacity and set this ticker to active
                line.style("opacity", "1.0");
                chart.explorationGraph.active[tickerLowerCase] = true;

                // Update the scales
                const scalesBegin = {
                    x : chart.phases.exploration.scales.x,
                    y : d3.scaleLinear()
                            .domain(chart.phases.exploration.scales.y.domain())
                            .range(chart.phases.exploration.scales.y.range())
                };

                chart.phases.exploration.scales.y.domain(getExtentYAxis(datasets, chart.explorationGraph.active))

                // Perform axis transition
                performAxisRescalingTransition(chart.selection.select("#chart-axis-y"),
                    d3.axisLeft,
                    chart.phases.exploration.scales.y.domain(getExtentYAxis(datasets, chart.explorationGraph.active)),
                    chartTransitionTime,
                    0);

                // Perform the lines transitions
                const keys = Object.keys(chart.explorationGraph.active);

                for(let i = 0; i < keys.length; ++i) {
                    const key = keys[i];

                    performPathRescalingTransition(chart.selection.select(`#chart-graph-line-${key}`),
                        datasets[key],
                        scalesBegin,
                        chart.phases.exploration.scales,
                        chartTransitionTime);
                }

            } else {
                // Set the line to 0 opacity and set this ticker to inactive
                line.style("opacity", "0.0");
                chart.explorationGraph.active[tickerLowerCase] = false;

                // Update the scales
                const scalesBegin = {
                    x : chart.phases.exploration.scales.x,
                    y : d3.scaleLinear()
                            .domain(chart.phases.exploration.scales.y.domain())
                            .range(chart.phases.exploration.scales.y.range())
                };

                chart.phases.exploration.scales.y.domain(getExtentYAxis(datasets, chart.explorationGraph.active))

                // Perform axis transition
                performAxisRescalingTransition(chart.selection.select("#chart-axis-y"),
                    d3.axisLeft,
                    chart.phases.exploration.scales.y.domain(getExtentYAxis(datasets, chart.explorationGraph.active)),
                    chartTransitionTime,
                    0);

                // Perform the lines transitions
                const keys = Object.keys(chart.explorationGraph.active);

                for(let i = 0; i < keys.length; ++i) {
                    const key = keys[i];

                    performPathRescalingTransition(chart.selection.select(`#chart-graph-line-${key}`),
                        datasets[key],
                        scalesBegin,
                        chart.phases.exploration.scales,
                        chartTransitionTime);
                }
            }
        });

    tickerContainer.append("label")
        .attr("for", `control-ticker-${tickerLowerCase}`)
        .style("color", color)
        .classed("ticker", true)
        .text(`${equity.CompanyName} (${equity.Ticker})`);

        return tickerContainer;
}

// Create date range controls
function createStockDateRangeControl(storyContainerSelection) {
    const yearBegin = 2000;
    const yearEnd = 2023;
    const controlContainer = storyContainerSelection.append("div");

    const selectBegin = controlContainer.append("select")
        .attr("id", "control-date-begin");

    for(let year = yearBegin; year < yearEnd; ++year) {
        const option = selectBegin.append("option")
            .attr("value", `${year}-01-01`)
            .text(year);

        if(year == yearBegin) {
            option.attr("selected", true);
        }
    }

    controlContainer.append("text")
        .text(" through ");

    const selectEnd = controlContainer.append("select")
        .attr("id", "control-date-end");

    for(let year = (yearBegin + 1); year <= yearEnd; ++year) {
        const option = selectEnd.append("option")
            .attr("value", (year != yearEnd) ? `${year}-01-01` : `${year}-07-01`)
            .text((year != yearEnd) ? year : `${year} (to July)`);

        if(year == yearEnd) {
            option.attr("selected", true);
        }
    }
}

// Get the y axis min and max from the given parameters
function getExtentYAxis(datasets, datasetsActiveState) {
    let globalMin = 0;
    let globalMax = 0;
    const keys = Object.keys(datasets);

    for(let i = 0; i < keys.length; ++i) {
        const key = keys[i];

        if(datasetsActiveState[key]) {
            const result = d3.extent(datasets[key], d => parseInt(d.Close));
            globalMin = Math.min(globalMin, result[0]);
            globalMax = Math.max(globalMax, result[1]);
        }
    }

    return [globalMin, globalMax];
}