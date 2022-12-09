odoo.define('ac_ktis_qc.template_workorder', function (require) {
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
var Loading = require('web.Loading');
var framework = require('web.framework');

var template_workorder = Widget.extend(ControlPanelMixin, {
    custom_events: {
        search: '_onSearch',
    },
    events:{
        'click .check_template': 'check_template',
        'click .check_equipment': 'check_equipment',
        'click .click_input': 'click_input',
        'change .change_value': 'input_change_value',
        'mouseenter .clickcomplete': 'click_complete',
        /*'keyup .autocomplete': 'autocomplete_value',*/
        /*'focus .autocomplete': 'autocomplete_value',*/
        /*"keyup input": "input_keyup",*/
        "click .btn_approve": "btn_approve",
        "click .btn_validate": "bnt_validate",
        "click .approve_move": "approve_move",
        "change .change_gen_time": "keep_gen_move_time",
        "change .change_adjust_time": "keep_adjust_move_time",
        "click .btn_adjust": "bnt_adjust",
        "click .check_readonly": "check_readonly",
    },

    init: function(parent, action) {
        this.actionManager = parent;
        this.action = action;
        this.domain = [];
        return this._super.apply(this, arguments);
    },

    input_keyup: function (e) {
        //ref: https://gist.github.com/krcourville/7309218
        var $table = $(".table-template");
        var $active = $('input:focus,select:focus',$table);
        console.log('input_keyup', $table, $active);
        var $next = null;
        var focusableQuery = 'input:visible,select:visible,textarea:visible';
        var position = parseInt( $active.closest('td').index()) + 1;
        e.preventDefault();
        console.log('e.keyCode', e.keyCode);
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
        if($next && $next.length){
            $next.addClass("element-focus").focus().select();
        }
    },

    check_equipment: function(e){
        var self = this;
        var data_id = $(e.target).attr("data-id");
        console.log('check_equipment', data_id);
        this.action.context['default_equipment_id'] = data_id;
        return this.get_html().then(function() {
            self.re_renderElement();
        });
    },

    check_template: function(e){
        var self = this;
        var data_id = $(e.target).attr("data-id");
        console.log('check_template', data_id);
        this.action.context['default_template_id'] = data_id;
        return this.get_html().then(function() {
            self.re_renderElement();
        });
    },

    click_input: function(e){
        var qc_type;
        $(e.target).addClass("element-focus").focus().select();
        qc_type = $(e.target).attr("data-qc_type");
    },

    click_complete: function(e){
    /*console.log('autocomplete_value');*/
        var $input = $(e.target);
        var dataset;
        var self = this;
        var target_value;
        var equipment_id = false;
        var workorder_id = false;
        var qc_line_id = false;
        var template_type;
        var qc_type;
        var time;
        var product_id = false;
        var location_id = false;
        var sequence = 0;
        try {
            if ($(e.target).attr("data-workorder")){
                workorder_id = field_utils.parse.integer($(e.target).attr("data-workorder"));
            }
            if ($(e.target).attr("data-equipment")){
                equipment_id = field_utils.parse.integer($(e.target).attr("data-equipment"));
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
            time = $(e.target).attr("data-time")
            qc_type = $input.attr('data-qc_type')
            template_type = $input.attr("data-template_type")
            current_id = $input.attr("data-qc_line_id")
        } catch(err) {
            console.log('ERROR ', e);
        }
        if ($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'products'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'template.workorder',
                method: 'get_chem_prod',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
            var lista = [];
            for (var r in res) {
                lista.push("<option value='"+res[r]+"'></option>") ;
                }
            document.getElementById("prod_list").innerHTML = (lista);
            /*$('.autocomplete').autocomplete({source:res});*/
                /*console.log('res', res);*/
                /*return res;*/
            });
        }
        if ($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'lot'){
            var vals = {
            'time': time,
            'values': target_value,
            'equipment_id': equipment_id,
            'workorder_id': workorder_id,
            'qc_id': qc_line_id,
            'product_id': product_id,
            'location_id': location_id,
            'qc_type': qc_type,
            'sequence': sequence};
            dataset = this._rpc({
                model: 'template.workorder',
                method: 'get_chem_lot',
                args: [vals],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
            var lista = [];
            for (var r in res) {
                lista.push("<option value='"+res[r]+"'></option>") ;
                }
            document.getElementById("lot_list").innerHTML = (lista);
            /*$('.autocomplete').autocomplete({source:res});*/
                /*console.log('res', res);*/
                /*return res;*/
            });
        }
        if($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'employee'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'template.workorder',
                method: 'get_employee_data',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
            var lista = [];
            for (var r in res) {
                lista.push("<option value='"+res[r]+"'></option>") ;
                }
            document.getElementById("emp_list").innerHTML = (lista);
            /*$('.autocomplete').autocomplete({source:res});*/
            /**//*console.log('res', res);*/
            /*return res;*/
            });
        }
        if($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'location'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'template.workorder',
                method: 'get_location_data',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
            var lista = [];
            for (var r in res) {
                lista.push("<option value='"+res[r]+"'></option>") ;
                }
            document.getElementById("location_list").innerHTML = (lista);
            /*$('.autocomplete').autocomplete({source:res});*/
            /**//*console.log('res', res);*/
            /*return res;*/
            });
        }
    },

    autocomplete_valuexx: function(e){
        console.log('autocomplete_value');
        var $input = $(e.target);
        var dataset;
        var self = this;
        var target_value;
        var equipment_id = false;
        var workorder_id = false;
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
            } else if ($input.attr('data-qc_line_type') == 'Measure'){
                target_value = field_utils.parse.float($input.val().replace(String.fromCharCode(8209), '-'));
            } else {
                target_value = $input.val().replace(String.fromCharCode(8209), '-');
            }
        } catch(err) {
            $input.val(0).focus().select();
            return this.do_warn(_t("Wrong value entered!"), err);
        }
        try {
            if ($(e.target).attr("data-workorder")){
                workorder_id = field_utils.parse.integer($(e.target).attr("data-workorder"));
            }
            if ($(e.target).attr("data-equipment")){
                equipment_id = field_utils.parse.integer($(e.target).attr("data-equipment"));
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
            time = $(e.target).attr("data-time")
            qc_type = $input.attr('data-qc_type')
            template_type = $input.attr("data-template_type")
            current_id = $input.attr("data-qc_line_id")
        } catch(err) {
            console.log('ERROR ', e);
        }
        if ($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'products'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'template.workorder',
                method: 'get_chem_prod',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
                $('.autocomplete').autocomplete({source:res});
                /*console.log('res', res);*/
                return res;
            });
        }
        if ($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'lot'){
            var vals = {
            'time': time,
            'values': target_value,
            'equipment_id': equipment_id,
            'workorder_id': workorder_id,
            'qc_id': qc_line_id,
            'product_id': product_id,
            'location_id': location_id,
            'qc_type': qc_type,
            'sequence': sequence};
            dataset = this._rpc({
                model: 'template.workorder',
                method: 'get_chem_lot',
                args: [vals],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
                $('.autocomplete').autocomplete({source:res});
                /*console.log('res', res);*/
                return res;
            });
        }
        if($input.attr('data-qc_line_id') != null && $input.attr('data-template_type') == 'employee'){
            var num = {'qc': $input.attr('data-qc_line_id')};
            dataset = this._rpc({
                model: 'template.workorder',
                method: 'get_employee_data',
                args: [num],
                kwargs: {context: self.action && self.action.context || session.user_context},
            })
            .then(function(res){
                $('.autocomplete').autocomplete({source:res});
                /*console.log('res', res);*/
                return res;
            });
        }
    },

    check_readonly: function(e){
        var self = this;
        var $input = $(e.target);
        var is_create;
        try {
            is_create = $input.attr('data-is_create')
            if ($input.attr('data-is_create') == "readonly"){
                $input.attr('readonly', 'readonly');
                }
            else {
                $input.removeAttr('readonly');
            }
        } catch(err) {
            $input.val(0).focus().select();
            return this.do_warn(_t("Wrong value entered!"), err);
            }
    },

    input_change_value: function(e){
        var self = this;
        /*framework.blockUI();*/
        /*$.blockUI.defaults.css = {};*/
        $.blockUI({css: { width: '4%', border:'0px solid #FFFFFF',cursor:'wait',backgroundColor:'#FFFFFF'},
          overlayCSS:  { backgroundColor: '#FFFFFF',opacity:0.0,cursor:'wait'}
          });
        var $input = $(e.target);
        var $input2 = $(e.target);
        var target_value;
        var equipment_id = false;
        var workorder_id = false;
        var qc_line_id = false;
        var template_type;
        var qc_type;
        var time;
        var product_id = false;
        var location_id = false;
        var sequence = 0;
        var template_id = false;
        console.log('>>>>>>>>> input_change_value', e);
        try {
            if ($input.attr('data-template_type') == 'checkbox' || $input.attr('data-template_type') == 'passfail'){
                if ($input.prop("checked")){
                    target_value = "Pass";
                }
                else {
                    target_value = "Failed";
                }
            } else if ($input.attr('data-qc_line_type') == 'Measure'){
                target_value = field_utils.parse.float($input.val().replace(String.fromCharCode(8209), '-'));
            } else {
                target_value = $input.val().replace(String.fromCharCode(8209), '-');
            }
        } catch(err) {
            $input.val(0).focus().select();
            return this.do_warn(_t("Wrong value entered!"), err);
        }
        try {
            if ($(e.target).attr("data-workorder")){
                workorder_id = field_utils.parse.integer($(e.target).attr("data-workorder"));
            }
            if ($(e.target).attr("data-equipment")){
                equipment_id = field_utils.parse.integer($(e.target).attr("data-equipment"));
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
            time = $(e.target).attr("data-time")
            qc_type = $input.attr('data-qc_type')
            template_type = $input.attr("data-template_type")
            current_id = $input.attr("data-qc_line_id")
        } catch(err) {
            console.log('ERROR ', e);
        }
        var vals={
            'time': time,
            'values': target_value,
            'equipment_id': equipment_id,
            'workorder_id': workorder_id,
            'qc_id': qc_line_id,
            'product_id': product_id,
            'location_id': location_id,
            'qc_type': qc_type,
            'sequence': sequence,
            /*'target_id':target_id,*/
        }
        self.set_loading()
        return this._rpc({
            model: 'template.workorder',
            method: 'add_qc_line',
            args: [vals],
            kwargs: {context: self.action && self.action.context || session.user_context},
        }).done(function (result) {
        for (let key in result){
            var obj = result[key];
            /*var $input = $('input[data-cal="'+obj['template_type']+'|'+time+'|'+obj['target_id']+'|'+obj['equipment_id']+'"]');*/
            var $input = $('input[data-cal="'+obj['template_type']+'|'+obj['time']+'|'+obj['target_id']+'|'+obj['equipment_id']+'|'+obj['sequence']+'"]');
            $input.val(obj['total']);}
            /*framework.unblockUI();*/
        $.unblockUI();
        });

        /*
        .done(function(res){
            self.get_html().then(function() {
            });
        });
            */
    },

    set_loading: function () {
        this.loading = new Loading(this);
        return this.loading.appendTo(this.$e);
    },

    destroy_loading: function () {
        this.loading = new Loading(this);
        return this.loading.destroy(this.$el);
    },

    btn_approve: function(e){
        var self = this;
        var idx = $(e.target).attr("data-idx");
        var state = $(e.target).attr("data-state");
        console.log('btn_approve', idx, state,);
        var args = {'idx': idx, 'state': state,};
        this._rpc({
            model: 'template.workorder',
            method: 'action_update_state',
            args: [args],
            kwargs: {context: self.action && self.action.context || session.user_context},
        })
        .done(function(state){
        /*if (state === 'done'){*/
        /*self.bnt_validate(e)*/
        /*};*/
            self.get_html().then(function() {
                return self.re_renderElement();
            });
        });
    },

    keep_gen_move_time: function(e){
        var self = this;
        var $input = $(e.target);
        var target_value;
        try {
            target_value = $input.val().replace(String.fromCharCode(8209), '-');
        } catch(err) {
            $input.val(0).focus().select();
            return this.do_warn(_t("Wrong value entered!"), err);
        }
        var idx = $(e.target).attr("data-idx");
        var state = $(e.target).attr("data-state");
        console.log('keep_gen_move_time', idx, state,);
        var args = {'idx': idx, 'state': state, 'values':target_value};
        this._rpc({
            model: 'template.workorder',
            method: 'keep_gen_move_time',
            args: [args],
            kwargs: {context: self.action && self.action.context || session.user_context},
        })
        .done(function(state){
        });
    },

    keep_adjust_move_time: function(e){
        var self = this;
        var $input = $(e.target);
        var target_value;
        try {
            target_value = $input.val().replace(String.fromCharCode(8209), '-');
        } catch(err) {
            $input.val(0).focus().select();
            return this.do_warn(_t("Wrong value entered!"), err);
        }
        var idx = $(e.target).attr("data-idx");
        var state = $(e.target).attr("data-state");
        console.log('keep_adjust_move_time', idx, state,);
        var args = {'idx': idx, 'state': state, 'values':target_value};
        this._rpc({
            model: 'template.workorder',
            method: 'keep_adjust_move_time',
            args: [args],
            kwargs: {context: self.action && self.action.context || session.user_context},
        })
        .done(function(state){
        });
    },

    bnt_validate: function(e){
        var self = this;
        var conf = confirm("Are you sure to create stock move ?");
        var active_id = this.action.context.active_id;
        var idx = $(e.target).attr("data-idx");
        /*var args = [active_id];*/
        var state = $(e.target).attr("data-state");
        var workorder_id = false;
        var template_id = false;
        var equipment_id = false;
        var sequence = 0;
        var qc_type;
        var time;
        if (conf == false){
            return
        }
        if ($(e.target).attr("data-workorder")){
            workorder_id = field_utils.parse.integer($(e.target).attr("data-workorder"));
        }
        if ($(e.target).attr("data-template")){
            template_id = field_utils.parse.integer($(e.target).attr("data-template"));
        }
        if ($(e.target).attr("data-tmpl_type")){
            qc_type = $(e.target).attr("data-tmpl_type");
        }
        if ($(e.target).attr("data-time")){
            time = $(e.target).attr("data-time");
        }
        if ($(e.target).attr("data-sequence")){
            sequence = field_utils.parse.integer($(e.target).attr("data-sequence"));
        }
        if ($(e.target).attr("data-equipment")){
            equipment_id = field_utils.parse.integer($(e.target).attr("data-equipment"));
        }
        console.log('bnt_validate', idx, state,);
        var vals = {'idx': idx,
                    'state': state,
                    'time': time,
                    'workorder_id': workorder_id,
                    'template_id': template_id,
                    'equipment_id': equipment_id,
                    'sequence': sequence,
                    'qc_type': qc_type,
                    };
        var context = self.action && self.action.context || session.user_context;
        var data_qc_type = $(e.target).attr('data-qc-type');
        var data_qc_group_id = $(e.target).attr('data-qc-group-id');
        /*context['default_qc_group_id'] = data_qc_group_id;*/
        /*context['default_qc_type'] = data_qc_type;*/
        this._rpc({
            model: 'mrp.workorder',
            method: 'button_validate_move',
            args: [vals],
            /*args: args,*/
            kwargs: {context: self.action && self.action.context || session.user_context},
            /*kwargs: {context:context},*/
        })
        .done(function(res){
            self.get_html().then(function() {
                return self.re_renderElement();
            });
        });
    },

    bnt_adjust: function(e){
        var self = this;
        var conf = confirm("Are you sure to adjust stock move ?");
        var active_id = this.action.context.active_id;
        var idx = $(e.target).attr("data-idx");
        /*var args = [active_id];*/
        var state = $(e.target).attr("data-state");
        var workorder_id = false;
        var template_id = false;
        var equipment_id = false;
        var sequence = 0;
        var qc_type;
        var time;
        if (conf == false){
            return
        }
        if ($(e.target).attr("data-workorder")){
            workorder_id = field_utils.parse.integer($(e.target).attr("data-workorder"));
        }
        if ($(e.target).attr("data-template")){
            template_id = field_utils.parse.integer($(e.target).attr("data-template"));
        }
        if ($(e.target).attr("data-tmpl_type")){
            qc_type = $(e.target).attr("data-tmpl_type");
        }
        if ($(e.target).attr("data-time")){
            time = $(e.target).attr("data-time");
        }
        if ($(e.target).attr("data-sequence")){
            sequence = field_utils.parse.integer($(e.target).attr("data-sequence"));
        }
        if ($(e.target).attr("data-equipment")){
            equipment_id = field_utils.parse.integer($(e.target).attr("data-equipment"));
        }
        console.log('bnt_validate', idx, state,);
        var vals = {'idx': idx,
                    'state': state,
                    'time': time,
                    'workorder_id': workorder_id,
                    'template_id': template_id,
                    'equipment_id': equipment_id,
                    'sequence': sequence,
                    'qc_type': qc_type,
                    };
        var context = self.action && self.action.context || session.user_context;
        var data_qc_type = $(e.target).attr('data-qc-type');
        var data_qc_group_id = $(e.target).attr('data-qc-group-id');
        /*context['default_qc_group_id'] = data_qc_group_id;*/
        /*context['default_qc_type'] = data_qc_type;*/
        this._rpc({
            model: 'mrp.workorder',
            method: 'button_adjust_move',
            args: [vals],
            /*args: args,*/
            kwargs: {context: self.action && self.action.context || session.user_context},
            /*kwargs: {context:context},*/
        })
        .done(function(res){
            self.get_html().then(function() {
                return self.re_renderElement();
            });
        });
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

    willStart: function() {
        return this.get_html();
    },
    start: function() {
        var self = this;
        console.log('start');
        this.render_search_view();
        return this._super.apply(this, arguments).then(function () {
            self.$el.html(self.html);
        });
    },
    get_html: function() {
        var self = this;
        console.log('get_html');
        return this._rpc({
            model: 'template.workorder',
            method: 'get_html',
            args: [this.domain],
            kwargs: {
                context: self.action && self.action.context || session.user_context,
            },
        })
        .then(function (result) {
            self.html = result.html;
            self.report_context = result.report_context;
            var template_state = result.report_context.template_state;
            if (template_state == 'done'){
            $("input").removeClass( "change_value" ).addClass('read');
            $("input").attr('readonly', 'readonly');
            };
        });
    },

    render_search_view: function(){
        var self = this;
        console.log(self)
        var defs = [];
        this._rpc({
                model: 'ir.model.data',
                method: 'get_object_reference',
                args: ['mrp', 'view_mrp_production_work_order_search'],
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
                        defs.push(self.update_link());
                        self.$searchview_buttons = self.searchview.$buttons.contents();
                    });
                });
            });
    },
    re_renderElement: function() {
        this.$el.html(this.html);
    },
    // Updates the control panel and render the elements that have yet to be rendered
    update_link: function() {
        var self = this;
        console.log('update_link');
        var x;
        var qc = rpc.query({
            model: 'template.workorder',
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
        this.update_link();
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

core.action_registry.add("template_workorder", template_workorder);
return template_workorder;
});
