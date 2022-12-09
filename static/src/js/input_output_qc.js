odoo.define('ac_ktis_qc.input_output_qc', function (require) {
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

var QWeb = core.qweb;
var _t = core._t;

var input_output_qc = Widget.extend(ControlPanelMixin, {
    custom_events: {
        search: '_onSearch',
    },
    events:{
        'click .template_qc_check': 'check_template',
        'click .ac_ktis_qc_check_eq': 'check_equipment',
        'focus .eq-input': 'autocomplete_value',
        'change .eq-input': 'input_change_value',
        'change .rem-input': 'remark_change_value',
        'click .eq-input': 'click_eq_input',
        "keyup input": "input_keydown",
        "click .btn-approve": "btn_approve",
        "click .btn-validate": "bnt_validate",
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
        console.log(eq_id);
        this.action.context['default_equipment_id'] = eq_id;
        return this.get_html().then(function() {
            self.re_renderElement();
        });

    },

    check_template: function(e){
        var self = this;
        var tmp_id = $(e.target).attr("data-id");
        this.action.context['default_template_id'] = tmp_id;
        return this.get_html().then(function() {
            self.re_renderElement();
        });
    },

    select_equipment: function(e){
        var self = this;
        var eq_id = $(e.target).attr("data-id");
    },

    click_eq_input: function(e){
        var qc_type;
        $(e.target).addClass("eq-input-focus").focus().select();
        qc_type = $(e.target).attr("data-qc_type");
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

    qs_to_obj: function (query) {
        var vals = {};
        var pl=/\+/g;
        var search=/([^&=]+)=?([^&]*)/g;
        var decode=function (s) {
            return decodeURIComponent(s.replace(pl, " "));
        };
        while (match = search.exec(query)) {
           var k=decode(match[1]);
           var v=decode(match[2]);
           if (v[0]=="[") {
               v=JSON.parse(v);
           }
           var comps=k.split(".");
           var p=vals;
           for (var i in comps) {
                var n=comps[i];
                if (i==comps.length-1) {
                    p[n]=v;
                } else {
                    if (!p[n]) p[n]={};
                    p=p[n];
                }
           }
        }
        //log("qs_to_obj",query,vals);
        return vals;
    },

    approve_move: function(e){
        var self = this;

        // CREATE MOVE ON FUNCTION
        console.log('approve');
        var active_id = this.action.context.active_id;
        var args = [active_id];
        console.log("args ",args);
        this._rpc({
            model: 'mrp.workorder',
            method: 'button_approve_move',
            args: args,
            kwargs: {context: self.action && self.action.context || session.user_context},
        })
        .done(function(res){
            self.get_html();
        });
    },

    bnt_validate: function(e){
        var self = this;
        var active_id = this.action.context.active_id;
        var args = [active_id];
        var context = self.action && self.action.context || session.user_context;
        var data_qc_type = $(e.target).attr('data-qc-type');
        var data_qc_group_id = $(e.target).attr('data-qc-group-id');
        context['default_qc_group_id'] = data_qc_group_id;
        context['default_qc_type'] = data_qc_type;
        this._rpc({
            model: 'mrp.workorder',
            method: 'button_validate_move',
            args: args,
            kwargs: {context: context},
        })
        .done(function(res){
            self.get_html();
        });
    },

    btn_approve: function(e){
        var self = this;
        var active_id = this.action.context.active_id;
        var args = [active_id];
        var context =  self.action && self.action.context || session.user_context;
        var state = $(e.target).attr("data-state");
        $(".template_qc_check").each(function(index, value){
            var checked = $(value).attr("checked");
            var qc_group_id = $(value).attr("data-id");
            if(checked == 'checked'){
                context['qc_group_id'] = qc_group_id
                return false; // break
            }
        });
        context['approve_state'] = state
        this._rpc({
            model: 'mrp.workorder',
            method: 'button_qc_approve',
            args: args,
            kwargs: {context: context},
        })
        .done(function(res){
            self.get_html();
        });
    },

    autocomplete_value: function(e){
        var $input = $(e.target);
        var dataset;
        var time = '';
        var qc_type = '';
        var template_type = '';
        var target_value = false;
        var equipment_id = false;
        var qc_line_id = false;
        var product_id = false;
        var location_id = false;
        var sequence;
        if ($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'products'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'product.product',
                method: 'get_chem_prod',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
                $('.eq-input').autocomplete({source:res});
                console.log('res 1', res);
                return res;
            });
        }

        else if ($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'lot'){
            try {
                if ($(e.target).attr("data-equiptment_id")){
                    equipment_id = field_utils.parse.integer($(e.target).attr("data-equiptment_id"));
                }
                if ($(e.target).attr("data-qc_line_id")){
                    qc_line_id   = field_utils.parse.integer($(e.target).attr("data-qc_line_id"));
                }
                if ($(e.target).attr("data-product") != null){
                    product_id   = field_utils.parse.integer($(e.target).attr("data-product"));
                }
                if ($(e.target).attr("data-location") != null){
                    location_id  = field_utils.parse.integer($(e.target).attr("data-location"));
                }
                time          = $(e.target).attr("data-time");
                qc_type       = $input.attr('data-qc_type')
                template_type = $input.attr("data-template_type");


            } catch(err) {
                console.log('ERROR ', e);
            }
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
            console.log('Input-autocom vals ', vals);
            dataset = this._rpc({
                model: 'product.product',
                method: 'get_chem_lot',
                args: [vals],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
                $('.eq-input').autocomplete({source:res});
                console.log('res ', res);
                return res;
            });
        }


        else if($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'employee'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            console.log('issue-key1');
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
        var template_type;
        var qc_type;
        var time;
        var product_id = false;
        var location_id = false;
        var sequence = 0;

        try {
            if ($input.attr('data-template_type') == 'checkbox' || $input.attr('data-template_type') == 'passfail'){
                if ($input.prop("checked")){
                    target_value = "Pass";
                }
                else {
                    target_value = "Failed";
                }
            }
            else if ($input.attr('data-qc_line_type') == 'Measure'){
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
                /*product_id = field_utils.parse.integer($(e.target).attr("data-product").replace(String.fromCharCode(8209), '-'));*/
            }
            if ($(e.target).attr("data-location") != null){
                location_id = field_utils.parse.integer($(e.target).attr("data-location"));
                /*location_id = field_utils.parse.integer($(e.target).attr("data-location").replace(String.fromCharCode(8209), '-'));*/
            }
            if ($(e.target).attr("data-sequence")){
                sequence = field_utils.parse.integer($(e.target).attr("data-sequence"));
            }
            time             = $(e.target).attr("data-time");
            qc_type         = $input.attr('data-qc_type')
            template_type     = $input.attr("data-template_type");

        } catch(err) {
            console.log('ERROR ', e);
        }
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
    render_search_view: function(){
        var self = this;
        console.log(self)
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

    auto_complete_emp: function(){
        //start
        var self = this;
        setTimeout(function(){
            $(".emp-autocomplete").autocomplete({
                source: function(request, response){
                    console.log('request ', request);
                    //TODO: call ajax
                    var name = request.term || '';
                    self._rpc({
                        model: 'hr.employee',
                        method: 'name_search',
                        args: [name],
                        kwargs: {context: self.action && self.action.context || session.user_context},
                    })
                    .done(function(res){
                        var data = [];
                        for(var i = 0 ; i < res.length; i++){
                            var rec = res[i];
                            var id = rec[0];
                            var name = rec[1];
                            //keep label & value same data
                            var vals ={
                                id: id,
                                value: name,
                                label: name,
                            }
                            data.push(vals);
                        }
                        response(data);
                    });
                },
                response: function(event, ui){
                    console.log('response ', event, ui);
                },
                select: function(event, ui){
                    var e = event;
                    var item = ui.item;
                    //TODO: create/update line to backend
                    var emp_name = item.value;
                    var time = $(e.target).data("time");
                    var equipment_id = $(e.target).data("equiptment_id");
                    var qc_line_id = $(e.target).data("qc_line_id");
                    var qc_type = $(e.target).data("qc_type");
                    var vals={
                        'time': time,
                        'values': emp_name,
                        'equipment_id': equipment_id,
                        'qc_id': qc_line_id,
                        'qc_type': qc_type,
                    }
                    console.log('select.vals ', vals);
                    self._rpc({
                        model: 'mrp.workorder',
                        method: 'add_qc_line',
                        args: [vals],
                        kwargs: {context: self.action && self.action.context || session.user_context},
                    })
                    .done(function(res){
                        self.get_html().then(function() {
                            console.log('DONE: selected item: ', item);
                        });
                    });
                    //
                },
            }).keypress(function(event){
                var keyCode = (event.keyCode ? event.keyCode : event.which);
                //console.log('keyCode ', keyCode);
                if(keyCode == 13){
                    //TODO: check data if not match then reset to empty
                    $(event.target).val("");
                }
            });

        },300);
    },

    start: function() {
        var self = this;
        console.log('start');
        this.render_search_view();
        this.auto_complete_emp()
        return this._super.apply(this, arguments).then(function () {
            self.$el.html(self.html);
        });
    },
    get_html: function() {
        var self = this;
        return this._rpc({
                model: 'inputoutput.qc',
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
    re_renderElement: function() {
        this.$el.html(this.html);
        this.auto_complete_emp();
    },
    // Updates the control panel and render the elements that have yet to be rendered
    update_cp: function() {
        var self = this;
        var x;
        if (!this.$buttons) {
            this.renderButtons();
        }
        var qc = rpc.query({
                    model: 'inputoutput.qc',
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

core.action_registry.add("input_output_qc", input_output_qc);
return input_output_qc;
});
