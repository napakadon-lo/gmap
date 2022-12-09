odoo.define("ac_ktis_qc.qc_template", function(require){
"use strict";

    var core = require('web.core');
    var Widget = require('web.Widget');
    var ControlPanelMixin = require('web.ControlPanelMixin');
    var session = require('web.session');
    var rpc = require('web.rpc');
    var QWeb = core.qweb;
	var AbstractField = require('web.AbstractField');
	var field_registry = require("web.field_registry");
    var _t = core._t;

	var QCTemplate = AbstractField.extend({
		template: 'QCTemplateView',

		events: {
			"keyup input": "keyup_input",
			"keypress input[test-type='number']": "keypress_input_number",
			"paste input[test-type='number']": "keypress_input_number",
			"change input": "change_qc_input",
			/*"dblclick .td-qc-item": "dbclick_td_item",*/
			"click .td-qc-item": "dbclick_td_item",
		},

		dbclick_td_item: function(e){
			e.preventDefault();
			var self = this;
			var res_id = $(e.target).attr("data-id");
			if (!res_id) return;
			res_id = parseInt(res_id);
			return this._rpc({
					model: 'mrp.qc.line',
					method: 'action_view_mrp_qc_line',
					args: [res_id],
					kwargs: {context: self.action && self.action.context || session.user_context},
				})
				.then(function(result) {
					self.do_action(result);
				});
		},

		keypress_input_number: function(e){
			//e.preventDefault();
			var charCode = (e.which) ? e.which : e.keyCode;
			//allow dot
			if(charCode == 46) {
				var val = $(e.target).val();
				if(_.contains(val,'.')) return false;
				return true;
			}
			if (charCode > 31 && (charCode < 48 || charCode > 57)) {
				return false;
			}
			return true;
		},

		change_qc_input: function(e){
			e.preventDefault();
			var self = this;
			var $td = $(e.target).parent("td");
			var qc_line_id = $td.attr("data-id");
			var qc_id = $td.attr("data-qc-id");
			var qtime = $td.attr("data-qtime");
			var test_type = $td.attr("test-type");
			var val = $(e.target).val() || '';
			if(test_type=='number') val = parseFloat(val.replace(',', '')) || '';
			var res_id = self.res_id;
			var model = self.model;
			if(model == 'mrp.qc' && res_id){
				self._rpc({
					model: model,
					method: 'update_template_data',
					args: [res_id, qc_line_id, val, qtime, qc_id],
				}).then(function(data){
					var recompute = data[2];
					if(recompute){
						/*
						self._render(function(){
							//issue: select next input 
						});
						*/
						;
					}else{
						var mode = data[0];
						var qc_line_id = data[1]['id'];
						if (mode == 'add'){
							$td.attr('data-id', qc_line_id);
						}
					}
				});
			}
		},

		init: function(){
			this._super.apply(this, arguments);
		},

		keyup_input: function (e) {
			//ref: https://gist.github.com/krcourville/7309218
			var $table = $(".table-qc");
			var $active = $('input:focus,select:focus',$table);
			var $next = null;
			var focusableQuery = 'input:visible,select:visible,textarea:visible';
			var position = parseInt($active.closest('td').index()) + 1;
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

		set_qc_table: function(){
			var self = this;


			// SET WIDTH 
			var sheet_w = parseInt($(".o_form_sheet").width());
			self.$el.find(".table-qc").css({"width": sheet_w+"px"});
			self.$el.find(".header-fixed").css({"width": sheet_w+"px"});

			// FIX HEADER 
			var tableOffset = this.$el.find(".table-qc").offset().top;
			var $header = this.$el.find(".table-qc > thead").clone();
			var $fixedHeader = this.$el.find(".header-fixed").append($header);

			$(".o_content").bind("scroll", function() {
				var offset = $(this).scrollTop();
				if (offset >= tableOffset && $fixedHeader.is(":hidden")) {
					$fixedHeader.show();
				}
				else if (offset < tableOffset) {
					$fixedHeader.hide();
				}
			});
		},

		_render: function(cb){
			var self = this;
            return $.when(this._super.apply(this, arguments)).then(function() {
				var model = self.model;
				var res_id = self.res_id;
				if(model == 'mrp.qc' && res_id){
					self._rpc({
						model: model,
						method: 'get_template_data',
						args: [res_id],
					}).then(function(data){
						data['mode'] = self.mode;
						var table = QWeb.render("qc-table-data", data);
						console.log('table =========',table)
						self.$el.html(table);
						self.set_qc_table();
						if (cb) cb();
					});
				}
			});

		},

		isSet: function () {                                                              
			return true; // show when readonly
		},
	});

	field_registry.add('ktis_qc_template', QCTemplate);
});
