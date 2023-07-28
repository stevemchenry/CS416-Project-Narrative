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
            postGreatRecession : {}
        },
        tooltip : {
            selection : null
        },
        linearRule : {
            selection : null
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
    // Create an alias for the chart used by this scene
    const chart = charts.line;

    // Create the dataset subset
    chart.phases.dotComBurst.dateEnd = new Date("2002-09-28");
    chart.phases.dotComBurst.dataSubset = datasets.spxHistorical.filter(d => (dateParser(d.Date) <= chart.phases.dotComBurst.dateEnd));
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
        .domain([600, 1600])
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
        .attr("id", "chart-annotations")

    let annotationText = [
        "The peak of the dot-com",
        "bubble occured in mid",
        "March of 2001, with the",
        "S&P 500 reaching a record",
        "high of over $1,500."
    ];
    
    createAnnotation(chartAnnotationsGroup,
        chart.phases.dotComBurst.scales.x(new Date("2000-03-18")),
        chart.phases.dotComBurst.scales.y(1527.46),
        410,
        annotationText,
        "bottomright")
        .attr("id", "chart-annotation-s1a1");

    let annotationText2 = [
        "After the dot-com bubble",
        "burst, the S&P 500 fell to a",
        "low of around $800; nearly",
        "half of its peak value."
    ];

    createAnnotation(chartAnnotationsGroup,
        chart.phases.dotComBurst.scales.x(new Date("2002-09-28")),
        chart.phases.dotComBurst.scales.y(800.58),
        400,
        annotationText2,
        "topleft")
        .attr("id", "chart-annotation-s1a2");

    // Perform the chart's entrance transition
    chart.selection.transition()
        .duration(sceneTransitionTime)
        .ease(d3.easeLinear)
        .attr("opacity", "1.0");

    // Perform the new path's entrance transition
    performPathEntranceTransition(pathValueSPX, pathEntranceTransitionTime, sceneTransitionTime);
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
    const dataSubsetCurrentRange = datasets.spxHistorical.filter(d => (dateParser(d.Date) <= chart.phases.growthPeriod2000s.dateEnd));

    // Create the 2000s growth period scales
    chart.phases.growthPeriod2000s.scales = {};

    // Update the chart title
    const chartTitleGroup = chart.selection.select("#chart-title-group");

    chartTitleGroup.selectAll("text")
        .datum("S&P 500 (SPX) January 2000 - June 2007")
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

    // Perform the annotation position shift transition
    performAnnotationReposition(chart.selection.select("#chart-annotation-s1a1"),
        chart.phases.growthPeriod2000s.scales.x(new Date("2000-03-18")),
        chart.phases.growthPeriod2000s.scales.y(1527.46));

    performAnnotationReposition(chart.selection.select("#chart-annotation-s1a2"),
        chart.phases.growthPeriod2000s.scales.x(new Date("2002-09-28")),
        chart.phases.growthPeriod2000s.scales.y(800.58));

    // Create the extended path
    const pathValueSPX = createPath(chartGraphGroup, "chart-graph-line-spx-2", chart.phases.growthPeriod2000s.dataSubset, chart.phases.growthPeriod2000s.scales, "steelblue");

    const pathValueSPXLength = pathValueSPX.node().getTotalLength();
    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength);
    
    // Perform the extended line's entrance transition
    performPathEntranceTransition(pathValueSPX, pathEntranceTransitionTime, chartTransitionTime);
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
    const dataSubsetCurrentRange = datasets.spxHistorical.filter(d => (dateParser(d.Date) <= chart.phases.greatRecession.dateEnd));

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

    // Create the extended path
    const pathValueSPX = createPath(chartGraphGroup, "chart-graph-line-spx-3", chart.phases.greatRecession.dataSubset, chart.phases.greatRecession.scales, "steelblue");

    const pathValueSPXLength = pathValueSPX.node().getTotalLength();
    pathValueSPX.attr("stroke-dashoffset", pathValueSPXLength)
        .attr("stroke-dasharray", pathValueSPXLength);
    
    // Perform the extended line's entrance transition
    performPathEntranceTransition(pathValueSPX, pathEntranceTransitionTime, chartTransitionTime);
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

    // Create the great recession scales
    chart.phases.postGreatRecession.scales = {};

    // Update the chart title
    const chartTitleGroup = chart.selection.select("#chart-title-group");

    chartTitleGroup.selectAll("text")
        .datum("S&P 500 (SPX) January 2000 - June 2023")
        .text(d => d);

    // Create the x scale
    chart.phases.postGreatRecession.scales.x = d3.scaleTime()
        .domain(d3.extent(datasets.spxHistorical, d => dateParser(d.Date)))
        .range([chart.marginLeft, (chart.width - chart.marginRight)]);

    // Create the y scale (this scale differs from the previous three scenes)
    chart.phases.postGreatRecession.scales.y = d3.scaleLinear()
        .domain([600, 5000])
        .range([(chart.height - chart.marginBottom), chart.marginTop]);

    // Rescale the x and y axes
    performAxisRescalingTransition(chart.selection.select("#chart-axis-x"), d3.axisBottom, chart.phases.postGreatRecession.scales.x, chartTransitionTime);
    performAxisRescalingTransition(chart.selection.select("#chart-axis-y"), d3.axisLeft, chart.phases.postGreatRecession.scales.y, chartTransitionTime);

    // Update the tooltip hitbox
    chart.selection.select("#chart-graph-tooltip-hitbox-group")
        .selectAll("rect")
        .on("mouseover", e => createStockChartSPXTooltip(e, chart, datasets.spxHistorical))
        .on("mouseout", () => {
            // Remove the tooltip and vertical rule
            removeTooltip(chart.tooltip.selection);
            removeLinearRule(chart.linearRule.selection);
        })
        .on("mousemove", e => moveStockChartSPXTooltip(e, chart, datasets.spxHistorical));    

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
function performAxisRescalingTransition(axisSelection, axisOrientation, scaleNew, durationTime) {
    return axisSelection
        .transition()
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
        <div><span style="font-weight:bold; color:steelblue;">${dataset[closestXPoint].Ticker}</span>: $${d3.format(",")(dataset[closestXPoint].Close)}</div>`;
    
    chart.tooltip.selection = createTooltip(tooltipContent)
        .style("left", `${e.clientX}px`)
        .style("top", `${100}px`);

    // Create the tooltip vertical rule
    chart.linearRule.selection = createLinearRule(chart.selection)
        .attr("d", `M${canvasPointerX},${chart.marginTop}L${canvasPointerX},${chart.height - chart.marginTop}`)
}

// Move the SPX stock chart tooltip to the cursor location
function moveStockChartSPXTooltip(e, chart, dataset) {
    // Move the tooltip and update it content
    const DateSegmentWidth = ((chart.width - chart.marginRight - chart.marginLeft) / dataset.length);
    const canvasPointerX = d3.pointer(e)[0];
    const closestXPoint = Math.max(Math.min(Math.round((canvasPointerX - chart.marginLeft - (DateSegmentWidth / 2)) / DateSegmentWidth), (dataset.length - 1)), 0);

    const tooltipContent = `<div style="font-weight:bold;">Week ending on ${dataset[closestXPoint].Date}</div>
        <div><span style="font-weight:bold; color:steelblue;">${dataset[closestXPoint].Ticker}</span>: $${d3.format(",")(dataset[closestXPoint].Close)}</div>`;

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
    const textIndent = 3;
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
function performAnnotationReposition(annotationSelection, x, y, durationTime) {
    return annotationSelection
        .transition()
        .duration(chartTransitionTime)
        .ease(d3.easeCubic)
        .attr("transform", `translate(${x},${y})`);
}