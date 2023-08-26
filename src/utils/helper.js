const _ = require('lodash');
const Cryptr = require('cryptr');
const moment = require('moment');
const { faker } = require('@faker-js/faker');
const { PDFDocument } = require('pdf-lib');
const {
  readFileSync,
  writeFileSync,
} = require('fs');

const Auth  = require('./Core');

const pluck = (data, name, uniq) => {
  if (name !== '') {
    if (uniq) {
      return _.uniq(
        _.compact(
          data.map((item) => _.result(item, name)),
        ),
      );
    }
    return data.map((item) => _.result(item, name));
  }
  return [];
};
exports.pluck = (data = [], name = '', uniq = true) => {

  if(_.isArray(name)){
    let _data = []
    name.forEach( ( val ,index) => {
      _data = _.flattenDeep(pluck(index === 0 ? data : _data, val , uniq))
    })
    return _data;
  }

  return pluck(data,name,uniq)
}

exports.encrypt = (string = 'simple') => {
  const cryptr = new Cryptr(process.env.SECRET_KEY_ENCRYPT);
  return cryptr.encrypt(string);
};

exports.decrypt = (string = 'simple') => {
  const cryptr = new Cryptr(process.env.SECRET_KEY_ENCRYPT);
  return cryptr.decrypt(string);
};

const hasMany = ({
  from, localField, foreignField, pipeline = [], let = {},as
}) => [{
  $lookup: {
    from,
    localField,
    foreignField,
    let,
    as: as || `_${_.snakeCase(from)}`,
    pipeline: [{$project:{_id:0}},...pipeline],
  },
}];

exports.hasOne = ({
  from, localField, foreignField, pipeline = [], let = {}, as
}) => {
  return [...hasMany({
    from,
    localField,
    foreignField,
    pipeline,
    let,
    as
  }),
    {
      $unwind: {
        path: as ? `$${as}` : `$_${_.snakeCase(from)}`,
        preserveNullAndEmptyArrays: true
      }
    }
  ];
};

exports.hasMany = hasMany;

exports.genCode = async (modelName, acronym = 'CODE', type = 'doc' || 'code', firstChar = '', numberLength = 5) => {
  let code = '';
  let _code = '';
  if (type === 'code')_code = `${acronym}`.toUpperCase();
  if (type === 'doc')_code = `${acronym}-${moment().format('YYMM')}`.toUpperCase();
  return modelCodeModel.findByIdAndUpdate(
    _code, // The ID to find for in counters model
    { $inc: { seq: 1 }, model: modelName }, // The update
    { new: true, upsert: true }, // The options
  ).then((counter) => {
    let char = firstChar;
    if (counter.seq >= +''.padStart(numberLength, '9')) {
      if (char !== '') char = String.fromCharCode(char.charCodeAt(0) + +counter.seq.toString()[0]);
      if (type === 'code') code = `${_code}-${char}${`${+counter.seq.toString().slice(1) === 0 ? 1 : (counter.seq + 1).toString().slice(1)}`.padStart(numberLength, '0')}`.toUpperCase();
      if (type === 'doc') code = `${_code}${`${counter.seq.toString().slice(1)}`.padStart(numberLength, '0')}`.toUpperCase();
    } else {
      if (type === 'code')code = `${_code}-${char}${`${counter.seq.toString()}`.padStart(numberLength, '0')}`.toUpperCase();
      if (type === 'doc')code = `${_code}${`${counter.seq.toString()}`.padStart(numberLength, '0')}`.toUpperCase();
    }
    return code;
  }).catch(() => faker.datatype.uuid());
};

exports.genID = async (modelName) => counterModel.findByIdAndUpdate( // ** Method call begins **
  modelName, // The ID to find for in counters model
  { $inc: { seq: 1 } }, // The update
  { new: true, upsert: true }, // The options
).then((counter) => counter.seq).catch(() => faker.datatype.uuid());

exports.PDFWatermark = async (options) => {
  const {
    text, pdf_path, image_path, output_dir, imageOption = {}, textOption = {},
  } = options;

  if (!pdf_path) {
    throw Error('Please add pdf_path in options.');
  }

  // load pdf
  const document = await PDFDocument.load(readFileSync(pdf_path));

  //   get pages and number of pages
  const pages = document.getPages();
  const numberOfPages = pages.length;

  // loop throgh all pages
  if (text) {
    for (let i = 0; i < numberOfPages; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      // text watermark
      await page.drawText(text, {
        x: 30,
        y: (height / 3) * 2,
        size: 12,
        opacity: 0.2,
        ...textOption,
        blendMode: 'Multiply',

      });
    }
  } else if (image_path) { // image watermark
    // load image
    const emblemImageBytes = readFileSync(image_path);
    const image = await document.embedPng(emblemImageBytes);
    const pngDims = image.scale(0.5);

    // loop throgh all pages
    for (let i = 0; i < numberOfPages; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      await page.drawImage(image, {
        // x: width / 2,
        y: (height / 3) * 2,
        size: 12,
        opacity: 0.2,
        width: pngDims.width,
        height: pngDims.height,
        ...imageOption,
      });
    }
  }

  // write to file
  writeFileSync(output_dir || pdf_path, await document.save());
};


exports.getFullName = (company, lang = 'th', nickname = false) =>{
  if (company === null || company === {} || company === undefined) {
    return '-';
  }
  let name = `${
    _.result(company, '__title.title_th', '') === 'ไม่มี'
      ? ''
      : _.result(company, `__title.title_${lang}`, '') || ''
        ? `${_.result(company, `__title.title_${lang}`)} `
        : ''
  }${
    _.result(company, `${lang === 'th' ? 'firstname' : 'firstname_en'}`) ??
    _.result(company, `firstname`)
  } ${
    _.result(company, `${lang === 'th' ? 'lastname' : 'lastname_en'}`) ??
    (_.result(company, `lastname`) || '')
  }${
    _.result(company, `__title.end_${lang}`) === null
      ? ''
      : ` ${_.result(company, `__title.end_${lang}`, '') || ''}`
  }`;

  if (_.get(company, 'branch_name', null)) {
    name = `${name} ${_.get(company, 'branch_name', '')}`;
  }
  const _nickName = _.get(company, 'nickname', '') ? ` (${_.get(company, 'nickname', '')})` : '';
  return name === undefined ? '-' : `${name}${nickname ? _nickName : ''}`;
}

exports.getAddress = (data) => {
  if (data) {
    const subDistrict =
      _.result(data, 'city', '') === 'กรุงเทพมหานคร'
        ? `แขวง${_.result(data, 'sub_district', '')}`
        : `ตำบล${_.result(data, 'sub_district', '')}`;
    const district =
      _.result(data, 'city', '') === 'กรุงเทพมหานคร'
        ? `เขต${_.result(data, 'district', '')}`
        : `อำเภอ${_.result(data, 'district', '')}`;
    return _.result(data, '__country.name_th', '') === 'ไทย'
      ? `${_.result(data, 'street_th', '') || ''} ${subDistrict} ${district} จังหวัด${
        _.result(data, 'city', '') || ''
      } ${_.result(data, 'zipcode', '') || ''}, ประเทศ${
        _.result(data, '__country.name_th', '') || ''
      }`
      : `${_.result(data, 'street_th', '') || ''} ${
        _.result(data, '__country.name_th', '') || ''
      }`;
  }
  return '-';
}

exports.getProductName = (product, withOptionalCode = false, lang = 'th') => {
  if (!product) {
    return 'ไม่พบสินค้าในระบบ';
  }
  return `${product.id_new ? `[${product.id_new}] - ` : ''}${
    product.default_code ? `${product.default_code} - ` : ''
  }${_.result(product, `name_${lang}`)}${
    withOptionalCode && product.optional_default_code ? ` - ${product.optional_default_code}` : ''
  }`;
}

exports.getInheritFunctionList = (model) => {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(model)).filter(
    (name) => typeof model[name] === 'function' && /^_/.test(name),
  );
}

exports.toCommas = (number, decimal = 2) =>{
  return parseFloat(number)
    .toFixed(decimal)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

exports.getAcceptanceCriteria = (value, acceptanceCriteria) => {
  if (!acceptanceCriteria || +acceptanceCriteria === 0) return { min: value, max: value, label: value };
  if (value === 0) return { min: value, max: value, label: value };
  if (_.isNaN(+value)) return { min: value, max: value, label: value };
  let min = +value;
  let max = +value;
  if (acceptanceCriteria.includes('%')) {
    max += max * (+acceptanceCriteria.split('%')[0] / 100);
    min -= min * (+acceptanceCriteria.split('%')[0] / 100);
  } else {
    max += +acceptanceCriteria;
    min -= +acceptanceCriteria;
  }

  return { min, max, label: `${min} - ${max}` };
};


exports.getAggregate = (model='test',relations=[])=>{
  const array = [];
  const myAggregate = require(`../function/aggregate/${model}`);
  const pick = _.pick(myAggregate, relations);
  for (let pickKey in pick) {
    pick[pickKey].forEach((item) => {
        array.push(item);
    });
  }
  return array;
}

exports.getHeaders = () => {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Auth.Auth.getToken() }`,
    },
  };
};

exports.getModel =(name) => {
  return require(`../models/${name}`);
}


exports.getServerPhp =()=>{
  return process.env.PHP_URL;
}

exports.getLinkImage =  (nodeId) => {
  if( nodeId){
    return `https://test.ledonhome.com/api/ledonhome/image/${nodeId}`
  }
  return ''
}

exports.getInherit = ( model , inherit= [] )=>{
  const _inherit =[]
  inherit.forEach((val) => {
    if (_.isArray(val)) {
      _inherit.push(...model[_.get(val, '0', null)](_.get(val, 1, [])));
    } else {
      _inherit.push(...model[val]());
    }
  });
  return _inherit
}

exports.getLimit =(limit =100 ,page=1) => {
  return limit === 0 ? [] : [{ $skip: (page - 1) * limit }, { $limit: limit }]
}


 exports.getSort = (sort) => {
  return Object.fromEntries(Object.entries(sort).map(([key, value]) =>
      [key, value === 'asc' ? 1 : value === 'desc' ? -1 : value]
  ));
 };


/**
 * id odoo : 16
 * @param Price ราคาขายรวม vat
 * @param Vat
 * @returns {{total: number, price: number, vat: number}}
 * ราคาขายรวม vat
 * ราคาสินค้าที่ยังไม่รวม VAT = 93.46 บาท
 * VAT 7% (100 x 7/107) 6.54 บาท
 * รวมราคาสินค้าทั้งสิ้น 100.00 บาท
 */
exports.priceExcludeVAT=(Price = 0.0, Vat = 7.0)=> {
  const vat = _.round((_.round(+Price, 2) * +Vat) / 107, 2);
  const price = _.round(_.round(+Price, 2) - vat, 2);
  const total = _.round(price + vat, 2);
  return { price, vat, total };
}

/**
 * id odoo : 2
 * @param Price ราคาสินค้าที่ยังไม่รวม
 * @param Vat
 * @returns {{total: number, price: number, vat: number}}
 * ราคาขายแยก vat
 * ราคาสินค้าที่ยังไม่รวม VAT = 100.00 บาท
 * VAT 7% (100 x 7/100) 7.00 บาท
 * รวมราคาสินค้าทั้งสิ้น 107.00 บาท
 */
exports.priceIncludeVAT=(Price = 0.0, Vat = 7.0)=> {
  const price = _.round(+Price, 2);
  const vat = _.round((price * +Vat) / 100, 2);
  const total = _.round(price + vat, 2);
  return { price, vat, total };
}

exports.buildPopulate = (value) => {
  if( _.isString(value)) return value

  const path = _.first(value)
  const populate = []
  _.last(value).map( val => {
    if(_.isArray(val)){
     populate.push(this.buildPopulate(val))
    }else {
      populate.push({path : val})
    }
  })
  return {path,populate}
}
