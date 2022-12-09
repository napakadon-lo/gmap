from odoo import models, fields, api, _
from odoo.exceptions import UserError
from datetime import *
from odoo.tools import DEFAULT_SERVER_DATE_FORMAT, DEFAULT_SERVER_DATETIME_FORMAT
import time

class Gmap(models.Model):
    _name = "gmap"

    name = fields.Char("Name", required=True)
    partner_from_id = fields.Many2one("res.partner", string="Partner From")
    partner_to_id = fields.Many2one("res.partner", string="Partner To")
