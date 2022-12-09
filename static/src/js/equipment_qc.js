odoo.define('ac_ktis_qc.equipment_qc', function (require) {
'use strict';

var core = require('web.core');
var rpc = require('web.rpc');
var session = require('web.session');
var Widget = require('web.Widget');
var ControlPanelMixin = require('web.ControlPanelMixin');
var SearchView = require('web.SearchView');
var data = require('web.data');
var pyeval = require('web.pyeval');
var field_utils = require('web.field_utils');
var ajax = require('web.ajax');

var QWeb = core.qweb;
var _t = core._t;


var equipment_qc = Widget.extend(ControlPanelMixin, {
    custom_events: {
        search: '_onSearch',
    },
    events:{
        /*
        'change .o_mps_save_input_text': 'mps_forecast_save',
        'change .o_mps_save_input_supply': 'on_change_quantity',
        'click .open_forecast_wizard': 'mps_open_forecast_wizard',
        'click .o_mps_apply': 'mps_apply',
        'click .o_mps_add_product': 'add_product_wizard',
        'click .o_mps_auto_mode': 'mps_change_auto_mode',
        'click .o_mps_generate_procurement': 'mps_generate_procurement',
        'mouseover .o_mps_visible_procurement': 'visible_procurement_button',
        'mouseout .o_mps_visible_procurement': 'invisible_procurement_button',
        'click .o_mps_product_name': 'open_mps_product',
        */
        'click .ac_ktis_qc_select_eq': 'select_equipment',
        'click .approve-btn': 'approve_move',
        'click .equipment_check': 'check_equipment',
        'click .template_check': 'check_template',
        'change .eq-input': 'input_change_value',
        //'focus .eq-input': 'autocomplete_value',
        'CHange .rem-input': 'remark_change_value',
        'click .eq-input': 'click_eq_input',
        "keyup input": "input_keydown",
    },
    init: function(parent, action) {
        this.actionManager = parent;
        this.action = action;
        this.domain = [];
        return this._super.apply(this, arguments);
    },


    input_keydown: function (e) {
        //ref: https://gist.github.com/krcourville/7309218
        var $table = $(".table-eq-qc");
        var $active = $('input:focus,select:focus',$table);
        var $next = null;
        var focusableQuery = 'input:visible,select:visible,textarea:visible';
        var position = parseInt( $active.closest('td').index()) + 1;
        e.preventDefault();
        switch(e.keyCode){
            case 37: // <Left>
                $next = $active.parent('td').prev().find(focusableQuery);   
                break;
            case 38: // <Up>
                $next = $active
                    .closest('tr')
                    .prev()
                    .find('td:nth-child(' + position + ')')
                    .find(focusableQuery)
                ;

                break;
            case 39: // <Right>
                $next = $active.closest('td').next().find(focusableQuery);
                break;
            case 13: // <Enter>
                $next = $active.closest('td').next().find(focusableQuery);
                if($next && $next.length < 1){
                    //Go to the first td
                    $next = $active.closest('tr').next().find('td:nth-child(' + 2 + ')').find(focusableQuery);
                }
                break;
            case 40: // <Down>
                $next = $active
                    .closest('tr')
                    .next()
                    .find('td:nth-child(' + position + ')')
                    .find(focusableQuery)
                ;
                break;
        }
        if($next && $next.length)
        {
            $next.addClass("eq-input-focus").focus().select();
        }
    },

    check_equipment: function(e){
        var self = this;
        var eq_id = $(e.target).attr("data-id");
        this.action.context['default_equipment_id'] = eq_id;
        console.log(eq_id);
        return this.get_html().then(function() {
            self.re_renderElement();
        });

    },

    check_template: function(e){
        var self = this;
        var tmp_id = $(e.target).attr("data-id");
        this.action.context['default_template_id'] = tmp_id;
        console.log(tmp_id);
        return this.get_html().then(function() {
            self.re_renderElement();
        });

    },

    select_equipment: function(e){
        var self = this;
        var eq_id = $(e.target).attr("data-id");
        console.log('eq_id ', eq_id);
        this.action.context['default_equipment_id'] = eq_id;
        return this.get_html().then(function() {
            self.re_renderElement();
        });


        //fixME
        var self = this;
        return this._rpc({
                model: 'equipment.qc',
                method: 'open_select_equipment',
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(result) {
                self.do_action(result);
            });
    },

    click_eq_input: function(e){
        $(e.target).addClass("eq-input-focus").focus().select();
    },

    remark_change_value: function(e){
        var self = this;
        var $input = $(e.target);
        var target_value;
        var time;
        var workorder;
        var tmp_id;
        try {
            target_value = $input.val().replace(String.fromCharCode(8209), '-');
        } catch(err) {
            $input.val(0).focus().select();
        }
        try {
            workorder = field_utils.parse.integer($(e.target).attr("data-order").replace(String.fromCharCode(8209), '-'));
            tmp_id = field_utils.parse.integer($(e.target).attr("data-template").replace(String.fromCharCode(8209), '-'));
            time = $(e.target).attr("data-time");
        } catch(err) {
            console.log('ERROR', e);
        }
        var vals = {'time': time,
                    'remark': target_value,
                    'workorder_id': workorder,
                    'template_id': tmp_id
        }
        console.log(vals);
        return this._rpc({
            model: 'mrp.workorder',
            method: 'add_remark_line',
            args: [vals],
            kwargs: {context: self.action && self.action.context || session.user_context},
        })
        .done(function(res){
            self.get_html().then(function() {
                //self.re_renderElement();
                //TODO:if enter then go next input
            });
        });
    },

    autocomplete_value: function(e){
        var $input = $(e.target);
        var dataset;
        if ($input.attr('data-qc_line_id') != null && $input.attr('data-qc_line_type') == 'Products'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'product.product',
                method: 'get_chem_prod',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
                $('.eq-input').autocomplete({source:res});
                return res;
            });
        }
        else if($input.attr('data-qc_line_id') != null && $input.attr('data-qc_line_type') == 'Employee'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'product.product',
                method: 'get_employee_data',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
                $('.eq-input').autocomplete({source:res});
                return res;
            });
        }
    },

    input_change_value: function(e){
        var self = this;
        var $input = $(e.target);
        var target_value;
        var equipment_id = false;
        var qc_line_id = false;
        var time;
        var product_id = false;
        var location_id = false;
        var dataset;
        var qc_type;
        var template_type;
        var sequence = 0;
        if ($input.attr('data-qc_line_id') != null && $input.attr('data-qc_type') == 'Products'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'product.product',
                method: 'get_chem_prod',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
                $('.eq-input').autocomplete({source:res});
                console.log('res ' + dataset);
                return res;
            });
        } else if($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'employee'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'product.product',
                method: 'get_employee_data',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
                $('.eq-input').autocomplete({source:res});
                return res;
            });
        }

        var check = '';
        var text = '';
        try {
            /*if ($input.attr('data-qc_type') == 'Pass - Fail'){*/
            if ($input.attr('data-template_type') == 'passfail'){
                if ($input.prop("checked")){
                    target_value = "Pass";
                    check = $input.attr('data-value');
                    text = $input.attr('data-text');
                    target_value = check + '|' + text
                }
                else {
                    target_value = "Failed";
                    check = $input.attr('data-value');
                    text = $input.attr('data-text');
                }
                /*target_value = check + '|' + text*/
                /*target_value = $input.val() */
                /*$input.attr('value') = target_value;*/
            }

            if ($input.attr('data-template_type') == 'checkbox'){
                if ($input.prop("checked")){
                    target_value = "Pass";
                }
                else {
                    target_value = "Failed";
                }
            }
            else if ($input.attr('data-template_type') == 'number'){
                target_value = field_utils.parse.float($input.val().replace(String.fromCharCode(8209), '-'));
            }
            else {
                target_value = $input.val().replace(String.fromCharCode(8209), '-');
            }
        } catch(err) {
            $input.val(0).focus().select();
            return this.do_warn(_t("Wrong value entered!"), err);
        }
        try {
            if ($(e.target).attr("data-equiptment_id")){
                equipment_id = field_utils.parse.integer($(e.target).attr("data-equiptment_id"));
            }
            if ($(e.target).attr("data-qc_line_id")){
                qc_line_id = field_utils.parse.integer($(e.target).attr("data-qc_line_id"));
            }
            if ($(e.target).attr("data-product") != null){
                product_id = field_utils.parse.integer($(e.target).attr("data-product"));
            }
            if ($(e.target).attr("data-location") != null){
                location_id = field_utils.parse.integer($(e.target).attr("data-location"));
            }
            if ($(e.target).attr("data-sequence")){
                sequence = field_utils.parse.integer($(e.target).attr("data-sequence"));
            }
            qc_type = $(e.target).attr("data-qc_type");
            time = $(e.target).attr("data-time");
            template_type = $(e.target).attr("data-template_type");

        } catch(err) {
            console.log('ERROR ', e);
        }
        var oops = {'checked' : check, 'text' : text, }
        var vals={
            'time': time,
            'values': target_value,
            'equipment_id': equipment_id,
            'qc_id': qc_line_id,
            'product_id': product_id,
            'location_id': location_id,
            'qc_type': qc_type,
            /*'template_type': template_type,*/
            'sequence': sequence,
        }
        return this._rpc({
            model: 'mrp.workorder',
            method: 'add_qc_line',
            args: [vals, oops],
            kwargs: {context: self.action && self.action.context || session.user_context},
        })
        .done(function(res){
            self.get_html().then(function() {
                //self.re_renderElement();
                //TODO:if enter then go next input
            });
        });
    },
    render_search_view: function(){
        var self = this;
        var defs = [];
        this._rpc({
                model: 'ir.model.data',
                method: 'get_object_reference',
                args: ['mrp', 'view_mrp_production_workcenter_form_view_filter'],
                kwargs: {context: session.user_context},
            })
            .then(function(view_id){
                self.dataset = new data.DataSetSearch(this, 'mrp.workorder');
                self.loadFieldView(self.dataset, view_id[1], 'search')
                .then(function (fields_view) {
                    self.fields_view = fields_view;
                    var options = {
                        $buttons: $("<div>"),
                        action: this.action,
                        disable_groupby: true,
                    };
                    self.searchview = new SearchView(self, self.dataset, self.fields_view, options);
                    self.searchview.appendTo($("<div>")).then(function () {
                        defs.push(self.update_cp());
                        self.$searchview_buttons = self.searchview.$buttons.contents();
                    });
                });
            });
    },
    willStart: function() {
        return this.get_html();
    },
    start: function() {
        var self = this;
        this.render_search_view();
        return this._super.apply(this, arguments).then(function () {
            self.$el.html(self.html);
        });
    },
    re_renderElement: function() {
        this.$el.html(this.html);


    },
    get_html: function() {
        var self = this;
        return this._rpc({
                model: 'equipment.qc',
                method: 'get_html',
                args: [this.domain],
                kwargs: {
                    context: self.action && self.action.context || session.user_context,
                },
            })
            .then(function (result) {
                self.html = result.html;
                self.report_context = result.report_context;
                self.renderButtons();
            });
    },

    // Updates the control panel and render the elements that have yet to be rendered
    update_cp: function() {
        var self = this;
        var x;

        if (!this.$buttons) {
            this.renderButtons();
        }
        var qc = rpc.query({
                    model: 'equipment.qc',
                    method: 'get_qc_type',
                    args: [this.domain],
                    kwargs: {
                        context: self.action && self.action.context || session.user_context,
                    },
                })
                .then(function (result) {
                    console.log(result);
                    x = self.actionManager.get_breadcrumbs();
                    x[x.length-1].title = result;

                    self.update_control_panel({
                        breadcrumbs: x,
                        cp_content: {},
                        searchview: this.searchview,
                    });
                }); 

    },
    do_show: function() {
        this._super();
        this.update_cp();
    },
    renderButtons: function() {
        var self = this;
        this.$buttons = $(QWeb.render("ac_ktis_qc.buttons", {}));
        //TODO: SAVE
        this.$buttons.on('click', function(){
            self._rpc({
                    model: 'sale.forecast',
                    method: 'generate_procurement_all',
                    args: [],
                    kwargs: {context: session.user_context},
                })
                .then(function(result){
                    self.get_html().then(function() {
                        self.re_renderElement();
                    });
                });
        });
        return this.$buttons;
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {OdooEvent} event
     */
    _onSearch: function (event) {
        var session = this.getSession();
        var result = pyeval.eval_domains_and_contexts({
            contexts: [session.user_context],
            domains: event.data.domains
        });
        this.domain = result.domain;
        this.get_html().then(this.re_renderElement.bind(this));
    },
});

core.action_registry.add("equipment_qc", equipment_qc);
return equipment_qc;
});

