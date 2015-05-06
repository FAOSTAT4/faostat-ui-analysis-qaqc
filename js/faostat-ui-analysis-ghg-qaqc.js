define(['jquery',
        'handlebars',
        'text!faostat_ui_analysis_ghg_qa_qc/html/templates.html',
        'i18n!faostat_ui_analysis_ghg_qa_qc/nls/translate',
        'FAOSTAT_UI_COMMONS',
        'FAOSTAT_UI_WIDE_TABLES',
        'chosen',
        'bootstrap',
        'sweetAlert'], function ($, Handlebars, templates, translate, Commons, WIDE_TABLES, chosen) {

    'use strict';

    function GHG_QA_QC() {

        this.CONFIG = {
            lang: 'en',
            data: {},
            lang_faostat: 'E',
            datasource: 'faostatdata',
            placeholder_id: 'faostat_ui_analysis_ghg_qaqc_placeholder',
            domains: [
                {id: 'gt', label: translate.gt},
                {id: 'ge', label: translate.ge},
                {id: 'gm', label: translate.gm},
                {id: 'gr', label: translate.gr},
                {id: 'gas', label: translate.gas},
                {id: 'gb', label: translate.gb},
                {id: 'gh', label: translate.gh}
            ]
        };

    }

    GHG_QA_QC.prototype.init = function(config) {

        /* Extend default configuration. */
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        /* Fix the language, if needed. */
        this.CONFIG.lang = this.CONFIG.lang != null ? this.CONFIG.lang : 'en';

        /* Store FAOSTAT language. */
        this.CONFIG.lang_faostat = Commons.iso2faostat(this.CONFIG.lang);

        /* This... */
        var _this = this;

        /* Register partials. */
        Handlebars.registerPartial('verification_structure', $(templates).filter('#verification_structure').html());

        /* Load template. */
        var source = $(templates).filter('#faostat_ui_analysis_ghg_qaqc').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            domains: this.CONFIG.domains,
            domain_label: translate.domains,
            land_use_label: translate.land_use,
            geographic_area_label: translate.areas,
            agriculture_label: translate.agriculture
        };
        var html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder_id).empty().html(html);

        /* Populate countries. */
        this.populate_countries();

        /* Domains selector. */
        var domains_selector = $('#domains');

        /* Initiate ChosenJS. */
        domains_selector.chosen();

        /* Chosen listener. */
        domains_selector.change(function() {
            _this.load_tabs();
        });

    };

    GHG_QA_QC.prototype.load_tabs = function() {

        /* Load template. */
        var source = $(templates).filter('#tabs').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            domains: this.CONFIG.domains
        };
        var html = template(dynamic_data);
        $('#tabs_content').empty().html(html);

        /* Select first tab. */
        $('a[href="#gt"]').tab('show');

        /* Load domains. */
        /* TODO: find something better. eval() doesn't work because this will be null then. */
        for (var i = 0 ; i < this.CONFIG.domains.length ; i++) {
            try {
                this.load_domain(this.CONFIG.domains[i].id)
            } catch (e) {

            }
        }

    };

    GHG_QA_QC.prototype.load_domain = function(domain_code) {

        /* This... */
        var _this = this;

        /* Load template. */
        var source = $(templates).filter('#' + domain_code + '_structure').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            gt_label: translate.gt,
            ge_label: translate.ge,
            gm_label: translate.gm,
            gr_label: translate.gr,
            gb_label: translate.gb,
            gh_label: translate.gh,
            gas_label: translate.gas,
            item_label: translate.item,
            charts_label: translate.charts,
            tables_label: translate.tables,
            emissions_label: translate.emissions,
            activity_label: translate.emissions_activity,
            table_selector_label: translate.table_selector_label,
            data_not_available_label: translate.data_not_available,
            buffaloes_label: translate.buffaloes,
            cattle_dairy_label: translate.cattle_dairy,
            cattle_non_dairy_label: translate.cattle_non_dairy,
            goats_label: translate.goats,
            horses_label: translate.horses,
            sheep_label: translate.sheep,
            camels_llamas_label: translate.camels_llamas,
            mules_asses_label: translate.mules_asses,
            swine_label: translate.swine,
            direct_soils_label: translate.direct_soil_emissions,
            fertilizers_label: translate.gy,
            manure_soils_label: translate.gp,
            crop_residues_label: translate.ga,
            organic_soils_label: translate.gv,
            pasture_label: translate.pasture_paddock_manure,
            indirect_soils_label: translate.indirect_emissions
        };
        var html = template(dynamic_data);
        $('#' + domain_code).empty().html(html);

        /* Select first tab. */
        $('a[href="#' + domain_code + '_charts"]').tab('show');

        /* Table selector. */
        var table_selector = $('#' + domain_code + '_table_selector');

        /* Load and fix Chosen. */
        table_selector.chosen();
        $('.chosen-container.chosen-container-single').css('width', '100%');

        /* Chosen listener. */
        table_selector.change(function() {
            _this.load_data($('#geographic_areas').val(), _this.get_selected_domain());
        });

    };

    GHG_QA_QC.prototype.populate_countries = function() {

        /* This... */
        var _this = this;

        /* Config WDS. */
        var rest_config = {
            domain: 'GT',
            tab_group: 1,
            tab_index: 1,
            datasource: this.CONFIG.datasource,
            lang_faostat: this.CONFIG.lang_faostat
        };

        /* Fetch data and populate the dropdown. */
        Commons.wdsclient('procedures/usp_GetListBox', rest_config, function(json) {
            var s = '<option value="null"></option>';
            for (var i = 0 ; i < json.length ; i++)
                s += '<option value="' + json[i][0] + '">' + json[i][1] + '</option>';
            $('#geographic_areas').html(s).chosen();
        }, 'http://localhost:8080/wds/rest');

        /* On change listener. */
        $('#geographic_areas').change(function() {

            /* Query DB, if needed. */
            _this.load_data($('#geographic_areas').val(), _this.get_selected_domain());

        });

    };

    GHG_QA_QC.prototype.load_data = function(area_code, domain_code) {

        /* This... */
        var _this = this;

        /* Query DB, if needed. */
        if (this.CONFIG.data[area_code] == null) {

            /* SQL Query. */
            var sql = _this.get_query(area_code);

            /* Query the DB. */
            Commons.wdstable(sql, function (json) {

                /* Store data. */
                _this.CONFIG.data[area_code] = json;

                /* Render tables. */
                _this.render_tables(domain_code);

            }, 'http://localhost:8080/wds/rest', {datasource: this.CONFIG.datasource});

        } else {

            /* Render tables. */
            this.render_tables(domain_code);

        }

    };

    GHG_QA_QC.prototype.render_tables = function(domain_code) {

        /* Table type. */
        var table_type = $('#' + domain_code + '_table_selector').val();

        try {

            /* Load template. */
            var source = $(templates).filter('#tables_' + table_type).html();
            var template = Handlebars.compile(source);
            var dynamic_data = {
                id: domain_code,
                nc_label: translate.nc,
                co2eq_label: translate.co2eq,
                faostat_label: translate.faostat,
                difference_label: translate.difference,
                export_data_label: translate.export_data_label,
                norm_difference_label: translate.norm_difference
            };
            var html = template(dynamic_data);
            $('#' + domain_code + '_tables_content').empty().html(html);

            /* Populate tables. */
            this.populate_tables($('#geographic_areas').val());

        } catch (e) {

        }

    };

    GHG_QA_QC.prototype.get_query = function(area_code) {
        return  'SELECT DomainCode, Year, UNFCCCCode, GUNFItemNameE, ' +
                'GUNFValue, GValue, PerDiff, ' +
                'NormPerDiff, TableType ' +
                'FROM DataUNFCCC ' +
                'WHERE AreaCode = \'' + area_code + '\' ' +
                'ORDER BY UNFCCCCode, Year DESC';
    };

    GHG_QA_QC.prototype.get_selected_domain = function() {
        return $($('#domains_tab').find('ul').find('li.active').find('a')[0]).attr('aria-controls');
    };

    GHG_QA_QC.prototype.populate_tables = function(area_code) {

        /* Table type. */
        var table_type = $('#gas_table_selector').val();

        /* Populate GAS tables. */
        this.populate_gas(area_code, table_type);

    };

    GHG_QA_QC.prototype.populate_gas = function(area_code, table_type) {

        /* Common configuration. */
        var wt_config = {
            show_row_code: true,
            row_code: 'UNFCCCCode',
            lang: this.CONFIG.lang,
            cols_dimension: 'Year',
            row_label: 'GUNFItemNameE'
        };

        /* Data for tables. */
        var gas_table_1 = [];
        for (var i = 0 ; i < this.CONFIG.data[area_code].length ; i++) {
            if (this.CONFIG.data[area_code][i].DomainCode == 'GAS' && this.CONFIG.data[area_code][i].TableType == table_type)
                gas_table_1.push(this.CONFIG.data[area_code][i]);
        }

        /* Initiate wide tables library. */
        var wt_1 = new WIDE_TABLES();
        var wt_2 = new WIDE_TABLES();
        var wt_3 = new WIDE_TABLES();
        var wt_4 = new WIDE_TABLES();

        /* Configure tables. */
        var wt_1_config = $.extend(true, {}, wt_config, {
            data: gas_table_1,
            value_dimension: 'GValue',
            placeholder_id: 'gas_table_1'
        });
        var wt_2_config = $.extend(true, {}, wt_config, {
            data: gas_table_1,
            value_dimension: 'GUNFValue',
            placeholder_id: 'gas_table_2'
        });
        var wt_3_config = $.extend(true, {}, wt_config, {
            data: gas_table_1,
            value_dimension: 'PerDiff',
            placeholder_id: 'gas_table_3'
        });
        var wt_4_config = $.extend(true, {}, wt_config, {
            data: gas_table_1,
            value_dimension: 'NormPerDiff',
            placeholder_id: 'gas_table_4'
        });

        /* Render tables. */
        wt_1.init(wt_1_config);
        wt_2.init(wt_2_config);
        wt_3.init(wt_3_config);
        wt_4.init(wt_4_config);

    };

    return GHG_QA_QC;

});