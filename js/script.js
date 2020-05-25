window.onload = main;

function main() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var svg = d3.select("svg");

    const TaiwanCoords = [121.5654, 25.033];
    const translation = [width / 2, height / 2];
    var projection = three_d_map(width / 1.8, translation, TaiwanCoords);
    var path = d3.geoPath().projection(projection);

    const InitialScale = projection.scale();
    const Sensitivity = 100;
    const CountriesColor = "#F4F6FC";
    const ocean_color = "#CCDCF2";
    const point_color = "orange";
    const link_color = "#5A7BB5";
    const ZoomRange = [1, 1];
    const LinksScale = 0.013;
    const PointsScaleList = [0.015, 0.03];
    var PointsScale = PointsScaleList[0];
    const count = 10;
    const data_date = ["2019年12月", "2020年1月", "2020年2月", "2020年3月"];

    const img_person_id = load_img_pattern(svg, "img/person.png", "img-person");
    const img_plane_id = load_img_pattern(svg, "img/plane.png", "img-plane");

    var rotation_btn;
    var change_icon_btn;
    var departure_btn;

    var files = [
        "https://unpkg.com/world-atlas@1/world/110m.json",
        "data/flights.csv",
    ];

    var promises = [];
    files.forEach((url) => {
        let splitted_url = url.split(".");
        if (splitted_url[splitted_url.length - 1] == "json") {
            promises.push(d3.json(url));
        } else if (splitted_url[splitted_url.length - 1] == "csv") {
            promises.push(d3.csv(url));
        }
    });

    // Main Function
    Promise.all(promises).then(function (values) {
        let world = values[0];

        // Convert {flights_data} to dictionary
        let flights_data = values[1],
            flights_data_dict = {};
        for (let i = 0; i < count; ++i) {
            let code = flights_data[i]["代碼"];
            flights_data_dict[code] = flights_data[i];
        }

        let topojson_world = topojson.feature(world, world.objects.countries);
        let target_world_mesh = topojson.mesh(
            world,
            world.objects.countries,
            function (a, b) {
                return a.id in flights_data_dict || b.id in flights_data_dict;
            }
        );
        let rest_world_mesh = topojson.mesh(
            world,
            world.objects.countries,
            function (a, b) {
                return !(
                    a.id in flights_data_dict || b.id in flights_data_dict
                );
            }
        );

        var tooltip = create_tooltip();
        var titlebox = create_titlebox("大學報 - 航空業面臨疫情之影響 (入境)");
        var infobox = create_infobox(titlebox);
        var globe_bg = draw_globe_bg(infobox, ocean_color);
        var countries = draw_countries(
            topojson_world,
            tooltip,
            infobox,
            flights_data_dict
        );
        var target_boundries = draw_boundries(target_world_mesh, "#111");
        var rest_boundries = draw_boundries(rest_world_mesh, "#999");
        var graticule = draw_graticule();
        var links_data = create_links(flights_data, count);
        var in_links = links_data[0],
            out_links = links_data[1];
        var links_components = draw_links(
            flights_data_dict,
            in_links,
            infobox,
            titlebox,
            tooltip,
            true,
            point_color,
            link_color
        );
        var links = links_components[0],
            points = links_components[1];

        enable_scroll_effect(globe_bg, links, points);
        rotation_btn = new Rotation_Btn();
        change_icon_btn = new Change_Icon_Btn(
            links_components,
            titlebox,
            point_color
        );
        departure_btn = new Departure_Btn(
            flights_data_dict,
            links_components,
            in_links,
            out_links,
            infobox,
            titlebox,
            tooltip,
            change_icon_btn
        );

        d3.select("#change-icon-btn").on("click", function () {
            change_icon_btn.change_status();
        });
        d3.select("#departure-btn").on("click", function () {
            departure_btn.change_status();
        });
    });

    function load_img_pattern(root, fpath, id) {
        root.append("defs")
            .attr("id", "mydef")
            .append("pattern")
            .attr("id", id)
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", 1)
            .attr("width", 1)
            .attr("viewBox", "0 0 64 64")
            .attr("preserveAspectRatio", "none")
            .append("image")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 64)
            .attr("height", 64)
            .attr("href", fpath)
            .attr("preserveAspectRatio", "none");

        return id;
    }

    function flat_map(scale, translation, center) {
        var projection = d3
            .geoMercator()
            .scale(scale) // 放大倍率
            .center(center)
            .translate(translation); // 置中

        return projection;
    }

    function three_d_map(scale, translation, center) {
        var projection = d3
            .geoOrthographic()
            .scale(scale) // 放大倍率
            .center([0, 0])
            .rotate([-center[0], -center[1]])
            .translate(translation); // 置中

        return projection;
    }

    function create_tooltip() {
        let tooltip = d3
            .select("body")
            .append("div")
            .style("position", "absolute")
            .style("z-index", "5")
            .style("visibility", "hidden")
            .style("background", "#fffc")
            .style("padding", ".1em .5em")
            .style("font-size", "1.2em")
            .style("border-radius", ".3em");

        return tooltip;
    }

    function create_titlebox(title) {
        let titlebox = d3
            .select("body")
            .append("div")
            .style("position", "fixed")
            .style("right", 0)
            .style("top", 0)
            .style("margin", "1em")
            .style("padding", ".5em")
            .style("background-color", "#ddd")
            .style("border-radius", ".5em")
            .style("border-style", "solid")
            .style("border-color", "#ccc3")
            .style("background-color", "transparent")
            .style("cursor", "pointer")
            .on("mouseover", function () {
                d3.select(this).style("border-color", "#ccc");
            })
            .on("mouseout", function () {
                d3.select(this).style("border-color", "#ccc3");
            });

        titlebox
            .append("div")
            .attr("class", "title")
            .style("font-size", "1.5em")
            .style("text-align", "center")
            .style("color", "#222c")
            .html(title);

        let svg = titlebox
            .append("svg")
            .style("height", "2.5em")
            .style("max-width", "21em");
        svg.append("circle")
            .attr("cx", "2.5em")
            .attr("cy", "1.5em")
            .attr("r", ".5em")
            .style("fill", "orange");
        svg.append("text")
            .attr("x", "3.5em")
            .attr("y", "1.5em")
            .text("航班數量")
            .style("font-size", "1em")
            .attr("text-anchor", "left")
            .attr("alignment-baseline", "middle")
            .style("fill", "#333d");

        return titlebox;
    }

    function create_infobox(root = null) {
        if (root == null) {
            root = d3.select("body");
        }

        let infobox = root
            .append("div")
            .attr("id", "infobox")
            .style("height", "60vh")
            .style("width", "inherit")
            .style("background-color", "#ddd")
            .style("border-radius", ".5em")
            .style("margin", ".5em")
            .style("padding", "1em")
            .style("box-sizing", "border-box")
            .style("display", "none")
            .style("background", "#8ccbbe55")
            .style("border", "1px solid #aaa9");
        // .on("click", function () {
        //     d3.select(this).style("width", "50vw").style("height", "65vh");
        // });

        infobox
            .append("div")
            .attr("class", "title")
            .style("font-size", "1.3em")
            .style("color", "#333c");

        infobox.append("div").attr("class", "content");
        infobox.append("svg").style("width", "inherit").style("height", "100%");

        return infobox;
    }

    function draw_globe_bg(infobox, color = "#97E5EF") {
        let globe_bg = svg
            .append("circle")
            .attr("fill", color)
            .attr("stroke", "#000")
            .attr("stroke-width", "0.2")
            .attr("cx", translation[0])
            .attr("cy", translation[1])
            .attr("r", InitialScale)
            .attr("class", "globe_bg")
            .attr("cursor", "pointer")
            .on("click", function () {
                infobox.style("display", "none");
            });

        return globe_bg;
    }

    function draw_countries(world, tooltip, infobox, flights_data) {
        let countries = svg
            .selectAll("_path")
            .data(world.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("id", (d) => "country" + d.id)
            .style("fill", CountriesColor)
            .style("opacity", (d) => {
                if (d.id in flights_data) {
                    return 1;
                } else {
                    return 0.85;
                }
            })
            .style("cursor", "pointer")
            .on("mouseover", function (d) {
                if (d.id in flights_data) {
                    set_tooltip(flights_data[d.id], tooltip);
                    highlight(d.id, true);
                } else {
                    d3.select(this).style("fill", "#3339");
                }
            })
            .on("mousemove", function () {
                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 10 + "px");
            })
            .on("mouseout", function (d) {
                tooltip.style("visibility", "hidden");
                highlight(d.id, false);
            })
            .on("click", function (d) {
                if (d.id in flights_data) {
                    show_info(flights_data[d.id], infobox);
                } else {
                    infobox.style("display", "none");
                }
            });

        return countries;
    }

    function highlight(code, on, country_color = "#ffb367aa") {
        if (on) {
            d3.select("#link" + code).style("opacity", 1);
            d3.select("#country" + code).style("fill", country_color);
            d3.select("#country158").style("fill", country_color);
        } else {
            d3.select("#link" + code).style("opacity", 0.25);
            d3.select("#country" + code).style("fill", CountriesColor);
            d3.select("#country158").style("fill", CountriesColor);
        }
    }

    function show_info(flight_data, infobox) {
        infobox.style("display", "block");
        infobox.select(".title").text(flight_data["國家"]);

        // TODO: Modifiy below code.
        console.log(flight_data["name"]);
        console.log(departure_btn.departure);
        infobox.select("svg");
    }

    function set_tooltip(flight_data, tooltip) {
        tooltip.text(flight_data["國家"]).style("visibility", "visible");
    }

    function draw_boundries(world, color = "#333") {
        let boundaries = svg
            .append("path")
            .datum(world)
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", color)
            .style("stroke-width", "0.015em");

        return boundaries;
    }

    function draw_graticule(step = [10, 10]) {
        let graticule = svg
            .append("path")
            .datum(d3.geoGraticule().step(step))
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", "#bbbc")
            .style("stroke-width", 0.2);

        return graticule;
    }

    function create_links(flights_data, count = 10) {
        let in_links = [],
            out_links = [];

        for (let i = 0; i < count; ++i) {
            let code = flights_data[i]["代碼"];
            let target_coords = [
                parseFloat(flights_data[i]["緯度"]),
                parseFloat(flights_data[i]["經度"]),
            ];

            in_links.push({
                type: "LineString",
                code: code,
                coordinates: [target_coords, TaiwanCoords],
            });
            out_links.push({
                type: "LineString",
                code: code,
                coordinates: [TaiwanCoords, target_coords],
            });
        }

        return [in_links, out_links];
    }

    function draw_links(
        flights_data,
        links_data,
        infobox,
        titlebox,
        tooltip,
        points_dynamic_scale = false,
        point_color = "orange",
        link_color = "orange",
        link_duration = 10000,
        point_duration = 10000
    ) {
        let links_base = svg.selectAll("_path").data(links_data).enter();

        // Draw Links
        let links = links_base
            .append("path")
            .attr("d", (d) => path(d))
            .attr("class", "link")
            .attr("id", (d) => "link" + d.code)
            .style("fill", "none")
            .style("stroke-width", projection.scale() * LinksScale)
            .style("stroke-linecap", "round")
            .style("opacity", 0.25)
            .style("cursor", "pointer")
            .style("stroke", link_color)
            .on("mouseover", function (d) {
                set_tooltip(flights_data[d.code], tooltip);
                highlight(d.code, true);
            })
            .on("mousemove", function () {
                tooltip
                    .style("top", event.pageY - 10 + "px")
                    .style("left", event.pageX + 10 + "px");
            })
            .on("mouseout", function (d) {
                tooltip.style("visibility", "hidden");
                highlight(d.code, false);
            })
            .on("click", function (d) {
                show_info(flights_data[d.code], infobox);
            });
        links_transition();

        // Draw Points
        var points = links_base
            .append("circle")
            .attr("id", (d) => "point" + d.code)
            .attr("r", InitialScale / 150)
            .attr("cx", (d, i) => {
                let path_node = links.nodes()[i],
                    point = path_node.getPointAtLength(0);
                return point.x;
            })
            .attr("cy", (d, i) => {
                let path_node = links.nodes()[i],
                    point = path_node.getPointAtLength(0);
                return point.y;
            })
            .style("fill", point_color)
            .style("opacity", 0.9);
        points_transition();

        // show titlebox or not
        if (points_dynamic_scale) {
            titlebox.select("svg").style("display", "block");
        } else {
            titlebox.select("svg").style("display", "none");
        }

        function links_transition() {
            links
                .transition()
                .duration(link_duration)
                .attrTween("stroke-dasharray", tweenDash)
                .on("end", function () {
                    links_transition();
                });

            function tweenDash() {
                return function (t) {
                    let l = this.getTotalLength(),
                        i = d3.interpolateString("0," + l, l + "," + l);
                    return i(t);
                };
            }
        }

        function points_transition(delay = 0) {
            points
                .transition()
                .delay(delay)
                .duration(point_duration)
                .tween("pathTween", function (d, i) {
                    return pathTween(links.nodes()[i], flights_data[d.code]);
                })
                .on("end", function () {
                    points_transition();
                });

            function pathTween(path_node, flight_data) {
                let people_count = [];
                for (let i = 0; i < data_date.length; ++i) {
                    people_count.push(
                        parseInt(
                            flight_data[data_date[i]].split(",").join(""),
                            10
                        )
                    );
                }

                for (let i = people_count.length - 1; i >= 0; --i) {
                    people_count[i] /= people_count[0];
                }
                let points_transition_scale = people_count;

                return function (t) {
                    let length = path_node.getTotalLength(),
                        r = d3.interpolate(0, length),
                        point = path_node.getPointAtLength(r(t)),
                        transition_scale_length =
                            points_transition_scale.length;

                    if (points_dynamic_scale) {
                        for (let i = 1; i <= transition_scale_length; ++i) {
                            if (t * transition_scale_length <= i) {
                                d3.select(this)
                                    .attr("cx", point.x)
                                    .attr("cy", point.y)
                                    .attr(
                                        "r",
                                        PointsScale *
                                            projection.scale() *
                                            points_transition_scale[i - 1]
                                    );

                                titlebox
                                    .select("text")
                                    .html("航班數量 - " + data_date[i - 1]);

                                break;
                            }
                        }
                    } else {
                        d3.select(this)
                            .attr("r", projection.scale() * PointsScale)
                            .attr("cx", point.x)
                            .attr("cy", point.y);
                    }
                };
            }
        }

        return [links, points];
    }

    function enable_scroll_effect(globe_bg, links, points) {
        svg.call(
            d3.drag().on("drag", () => {
                const rotate = projection.rotate();
                const k = Sensitivity / projection.scale();
                projection.rotate([
                    rotate[0] + d3.event.dx * k,
                    rotate[1] - d3.event.dy * k,
                ]);
                // Update all path
                path = d3.geoPath().projection(projection);
                svg.selectAll("path").attr("d", path);
            })
        ).call(
            d3.zoom().on("zoom", () => {
                var curr_rotate = projection.rotate();

                if (d3.event.transform.k > ZoomRange[0]) {
                    d3.event.transform.k = ZoomRange[0];
                    var next_rotate = [-TaiwanCoords[0], -TaiwanCoords[1]];
                    projection.scale(InitialScale);
                    globe_bg.attr("r", projection.scale());
                    var flat = true;
                } else if (d3.event.transform.k < ZoomRange[1]) {
                    d3.event.transform.k = ZoomRange[1];
                    var next_rotate = [
                        -TaiwanCoords[0] - 70,
                        -TaiwanCoords[1] - 20,
                    ];
                    projection.scale(InitialScale * 0.7);
                    globe_bg.attr("r", projection.scale());
                    var flat = false;
                }

                if (next_rotate != curr_rotate) {
                    svg.selectAll("path").attr("d", function (d) {
                        // don't apply transition to links and points
                        if (d3.select(this).attr("class") != "link") {
                            d3.select(this)
                                .transition()
                                .duration(300)
                                .attrTween("d", function (d) {
                                    let r = d3.interpolate(
                                        curr_rotate,
                                        next_rotate
                                    );

                                    return function (t) {
                                        projection.rotate(r(t));

                                        path = d3
                                            .geoPath()
                                            .projection(projection);
                                        let pathD = path(d);
                                        return pathD == null ? "" : pathD;
                                    };
                                });
                        } else {
                            projection.rotate(next_rotate);
                            path = d3.geoPath().projection(projection);
                            let curr_link = d3.select(this);
                            setTimeout(function () {
                                curr_link.attr("d", path);
                            }, 300);
                        }
                    });
                }
            })
        );
    }

    function Rotation_Btn() {
        this.enable_rotation = false;

        let rotation_timer = d3.interval(rotate, 50);
        rotation_timer.stop();

        let rotation_btn = d3.select("#rotation-btn").on("click", function () {
            if (this.enable_rotate) {
                this.enable_rotate = false;
                rotation_timer.stop();
                d3.select(this).style("background", "none");
            } else {
                this.enable_rotate = true;
                rotation_timer.restart(rotate);
                d3.select(this).style("background", "#7777");
            }
        });

        function rotate(elapsed) {
            const rotate = projection.rotate();
            const k = Sensitivity / projection.scale();
            projection.rotate([rotate[0] - k, rotate[1]]);
            path = d3.geoPath().projection(projection);
            svg.selectAll("path").attr("d", path);
        }

        return rotation_btn;
    }

    function Departure_Btn(
        flights_data_dict,
        links_components,
        in_links,
        out_links,
        infobox,
        titlebox,
        tooltip,
        change_icon_btn
    ) {
        this.departure = false;

        this.change_status = function () {
            this.departure = !this.departure;

            if (this.departure == false) {
                clear_links();
                add_links(in_links, true);
                titlebox
                    .select(".title")
                    .html("大學報 - 航空業面臨疫情之影響 (入境)");
                d3.select("#change-icon-btn").attr(
                    "class",
                    "fas fa-walking icons"
                );
                d3.select("#departure-btn").style("background", "none");
                change_icon_btn.change_status(false);
            } else {
                clear_links();
                add_links(out_links, false);
                titlebox
                    .select(".title")
                    .html("大學報 - 航空業面臨疫情之影響 (出境)");
                d3.select("#change-icon-btn").attr(
                    "class",
                    "fas fa-plane icons"
                );
                d3.select("#departure-btn").style("background", "#7777");
                change_icon_btn.change_status(false);
            }
        };

        function clear_links() {
            for (let i = links_components.length - 1; i >= 0; --i) {
                links_components[i].remove();
                links_components.pop();
            }
        }

        function add_links(links, dynamic_size) {
            var components = draw_links(
                flights_data_dict,
                links,
                infobox,
                titlebox,
                tooltip,
                dynamic_size,
                point_color,
                link_color
            );
            for (let i = 0; i < components.length; ++i) {
                links_components.push(components[i]);
            }
        }
    }

    function Change_Icon_Btn(links_components, titlebox, point_color) {
        this.show = false;

        this.change_status = function (show = null) {
            if (show == null) {
                this.show = !this.show;
            } else {
                this.show = show;
            }

            let points = links_components[1];
            if (this.show == false) {
                d3.select("#change-icon-btn").style("background", "none");
                points.style("fill", point_color);
                PointsScale = PointsScaleList[0];
                titlebox
                    .select("circle")
                    .style("fill", point_color)
                    .attr("r", ".5em");
            } else {
                let classes = d3.select("#change-icon-btn").attr("class"),
                    img_id;
                if (classes == "fas fa-walking icons") {
                    img_id = img_person_id;
                } else if (classes == "fas fa-plane icons") {
                    img_id = img_plane_id;
                }

                d3.select("#change-icon-btn").style("background", "#7777");
                points.style("fill", "url(#" + img_id + ")");
                PointsScale = PointsScaleList[1];
                titlebox
                    .select("circle")
                    .style("fill", "url(#" + img_id + ")")
                    .attr("r", "1em");
            }
        };
    }
}
