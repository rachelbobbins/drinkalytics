$(function () {
  $('input[type="reset"]').on('click', function () {
    $(this).closest('.position').find('input[type="radio"]').prop('checked', false).removeAttr('checked');
  })
})