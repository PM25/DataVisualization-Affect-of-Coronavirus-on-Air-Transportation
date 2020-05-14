window.onload = main;

function main() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var svg = d3.select("svg");

    var projection = d3
        .geoOrthographic()
        .scale(500) // 放大倍率
        .center([0, 0])
        .rotate([-121.5654, -25.033])
        .translate([width / 2, height / 2]); // 置中
    var path = d3.geoPath().projection(projection);

    const initialScale = projection.scale();
    const zoom = d3.zoom().scaleExtent([0.6, 10]).on("zoom", zoomed);
    const sensitivity = 30;
    // svg.call(
    //     d3.drag().on("drag", () => {
    //         const rotate = projection.rotate();
    //         const k = sensitivity / projection.scale();
    //         projection.rotate([
    //             rotate[0] + d3.event.dx * k,
    //             rotate[1] - d3.event.dy * k,
    //         ]);
    //         path = d3.geoPath().projection(projection);
    //         svg.selectAll("path").attr("d", path);
    //     })
    // ).call(
    //     d3.zoom().on("zoom", () => {
    //         if (d3.event.transform.k > 0.3) {
    //             projection.scale(initialScale * d3.event.transform.k);
    //             path = d3.geoPath().projection(projection);
    //             svg.selectAll("path").attr("d", path);
    //             globe.attr("r", projection.scale());
    //         } else {
    //             d3.event.transform.k = 0.3;
    //         }
    //     })
    // );

    function zoomed() {
        svg.selectAll("path") // To prevent stroke width from scaling
            .attr("transform", d3.event.transform);
    }

    var files = [
        "https://unpkg.com/world-atlas@1/world/110m.json",
        "data/flights.csv",
    ];

    var promises = [];
    files.forEach((url) => {
        let splited_url = url.split(".");
        if (splited_url[splited_url.length - 1] == "json") {
            promises.push(d3.json(url));
        } else if (splited_url[splited_url.length - 1] == "csv") {
            promises.push(d3.csv(url));
        }
    });

    taiwan_coords = [121.5654, 25.033];
    const config = {
        speed: 0.001,
        verticalTilt: -30,
        horizontalTilt: 0,
    };
    Promise.all(promises).then(function (values) {
        // Draw Map
        world = values[0];

        world = topojson.feature(world, world.objects.countries);

        let globe = svg
            .append("circle")
            .attr("fill", "#588da8")
            .attr("stroke", "#000")
            .attr("stroke-width", "0.2")
            .attr("cx", width / 2)
            .attr("cy", height / 2)
            .attr("r", initialScale)
            .attr("class", "globe");

        svg.selectAll("path")
            .data(world.features)
            .enter()
            .append("path")
            .attr("class", "world")
            .attr("d", path);

        // Draw Boundary
        svg.append("path")
            .datum(world)
            .attr("d", path)
            .attr("class", "boundary");

        drawGraticule();

        // Top 10 flight export countries
        flights_data = values[1];

        var links = [];
        for (let i = 0; i < 10; ++i) {
            let country = flights_data[i]["國家"];
            let target_coords = [
                parseFloat(flights_data[i]["緯度"]),
                parseFloat(flights_data[i]["經度"]),
            ];

            links.push({
                type: "LineString",
                target_country: country,
                coordinates: [taiwan_coords, target_coords],
            });
        }

        var line = d3.line().curve(d3.curveBasis);
        // var path = svg
        //     .append("path")
        //     .attr("d", line(lineData))
        //     .style("stroke", "black")
        //     .style("fill", "none");

        let myLinks = svg
            .selectAll("MyPath")
            .data(links)
            .enter()
            .append("path")
            .attr("d", (d) => path(d))
            .attr("class", "link")
            .style("fill", "none")
            .style("stroke-width", initialScale / 200)
            .call(transition)
            .call(foo);
        // .transition()
        // .duration(1000)
        // .attrTween("stroke-dasharray", tweenDash);

        // .style("stroke", "#ffb36799")
        // .style("stroke-width", 0.4);

        function transition(path) {
            path.transition()
                .duration(1000)
                // .attrTween("stroke-dasharray", tweenDash)
                .attrTween("stroke-dasharray", tweenDash);
        }

        function tweenDash() {
            var l = this.getTotalLength(),
                i = d3.interpolateString("0," + l, l + "," + l);
            return function (t) {
                return i(t);
            };
        }

        function foo(path) {
            path.style("stroke-dasharray", "none");
            // myLinks.style("stroke-dasharray", "none");
        }

        // console.log();

        svg.call(
            d3.drag().on("drag", () => {
                const rotate = projection.rotate();
                const k = sensitivity / projection.scale();
                projection.rotate([
                    rotate[0] + d3.event.dx * k,
                    rotate[1] - d3.event.dy * k,
                ]);
                path = d3.geoPath().projection(projection);
                svg.selectAll("path").attr("d", path);
            })
        ).call(
            d3.zoom().on("zoom", () => {
                if (d3.event.transform.k < 0.3) {
                    d3.event.transform.k = 0.3;
                } else if (d3.event.transform.k > 15) {
                    d3.event.transform.k = 15;
                } else {
                    projection.scale(initialScale * d3.event.transform.k);
                    path = d3.geoPath().projection(projection);
                    svg.selectAll("path").attr("d", path);
                    globe.attr("r", projection.scale());
                    myLinks.style("stroke-width", projection.scale() / 200);
                    // myLinks.style("stroke-dasharray", "none");
                }
            })
        );

        // drawGraticule();
        // enableRotation();
        function enableRotation() {
            // d3.timer(function (elapsed) {
            //     projection.rotate([
            //         config.speed * elapsed - 120,
            //         config.verticalTilt,
            //         config.horizontalTilt,
            //     ]);
            //     svg.selectAll("path").attr("d", path);
            // });
            //Optional rotate
            d3.timer(function (elapsed) {
                const rotate = projection.rotate();
                const k = sensitivity / projection.scale();
                projection.rotate([rotate[0] - 1 * k, rotate[1]]);
                path = d3.geoPath().projection(projection);
                svg.selectAll("path").attr("d", path);
            }, 1000);
        }

        function drawGraticule() {
            const graticule = d3.geoGraticule().step([10, 10]);

            svg.append("path")
                .datum(graticule)
                .attr("class", "graticule")
                .attr("d", path)
                .style("fill", "none")
                .style("stroke", "#cccc")
                .style("stroke-width", 0.2);
        }
    });
}
